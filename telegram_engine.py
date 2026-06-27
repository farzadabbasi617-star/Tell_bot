import asyncio
import os
import sqlite3
from datetime import datetime, timezone
from db import get_db, add_log

try:
    from telethon import TelegramClient
    from telethon.tl.functions.channels import GetParticipantsRequest, InviteToChannelRequest
    from telethon.tl.types import ChannelParticipantsRecent, UserStatusOnline, UserStatusRecently, UserStatusOffline
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False

class TelegramEngine:
    def __init__(self):
        self.is_scraping = False
        self.is_adding = False
        self.active_client = None

    def _get_api_credentials(self):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT api_id, api_hash FROM settings WHERE id=1")
        row = c.fetchone()
        conn.close()
        api_id = int(row['api_id']) if row and row['api_id'] else 2040
        api_hash = row['api_hash'] if row and row['api_hash'] else "b18441a1ff607e10a989891a5462e627"
        return api_id, api_hash

    async def get_client_for_account(self, phone: str):
        if not TELETHON_AVAILABLE:
            add_log("کتابخانه Telethon نصب نیست. دستور pip install telethon را اجرا کنید.", "error")
            return None
            
        api_id, api_hash = self._get_api_credentials()
        if not api_id or not api_hash:
            add_log("خطا: API ID و API Hash در بخش تنظیمات وارد نشده است.", "error")
            return None

        session_path = f"session_{phone}"
        client = TelegramClient(session_path, api_id, api_hash)
        await client.connect()
        if not await client.is_user_authorized():
            add_log(f"اکانت {phone} احراز هویت نشده است. لطفا ابتدا لاگین کنید.", "warning")
            await client.disconnect()
            return None
        return client

    async def scrape_group(self, group_url: str, speed_mode: str, filter_mode: str):
        self.is_scraping = True
        add_log(f"عملیات اسکرپ از {group_url} آغاز شد...", "info")
        
        if not TELETHON_AVAILABLE:
            add_log("حالت شبیه‌سازی: کتابخانه Telethon یافت نشد. در حال تولید داده‌های تستی...", "warning")
            await asyncio.sleep(1)
            add_log("اتصال به سرور مجازی موفق.", "success")
            conn = get_db()
            c = conn.cursor()
            sample_names = [("علیرضا محمدی", "@alireza_m"), ("سارا احمدی", "@sarah_ah"), ("مهدی رضایی", "@mahdi_r"), ("نیما کریمی", "@nima_k"), ("زهرا علوی", "@zahra_al")]
            for idx, (name, uname) in enumerate(sample_names):
                if not self.is_scraping:
                    break
                tg_id = 100000 + idx + int(datetime.now().timestamp() % 1000)
                c.execute("""
                    INSERT OR IGNORE INTO members (tg_id, username, name, status, source_group, scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (tg_id, uname, name, "Active", group_url, datetime.now().strftime("%Y-%m-%d %H:%M")))
                conn.commit()
                await asyncio.sleep(0.8)
                add_log(f"کاربر استخراج شد: {name} ({uname})", "info")
            conn.close()
            add_log("استخراج اعضا با موفقیت به پایان رسید.", "success")
            self.is_scraping = False
            return

        # Real Telethon Scraping Logic
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT phone FROM accounts WHERE status='Active' LIMIT 1")
        acc_row = c.fetchone()
        conn.close()
        
        if not acc_row:
            add_log("هیچ اکانت تلگرامی فعالی برای اسکرپ یافت نشد.", "error")
            self.is_scraping = False
            return

        client = await self.get_client_for_account(acc_row['phone'])
        if not client:
            self.is_scraping = False
            return

        try:
            add_log(f"در حال دریافت اطلاعات گروه توسط اکانت {acc_row['phone']}...", "info")
            entity = await client.get_entity(group_url)
            
            offset = 0
            limit = 100
            total_extracted = 0
            
            while self.is_scraping:
                participants = await client(GetParticipantsRequest(
                    channel=entity,
                    filter=ChannelParticipantsRecent(),
                    offset=offset,
                    limit=limit,
                    hash=0
                ))
                
                if not participants.users:
                    break
                    
                conn = get_db()
                c = conn.cursor()
                
                for user in participants.users:
                    if user.bot or user.deleted:
                        continue
                        
                    # Filter active users
                    status_str = "Offline"
                    if isinstance(user.status, UserStatusOnline):
                        status_str = "Active"
                    elif isinstance(user.status, UserStatusRecently):
                        status_str = "Recently Seen"
                        
                    if filter_mode == "فعال در ۲۴ ساعت اخیر" and status_str != "Active":
                        continue
                        
                    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
                    username = f"@{user.username}" if user.username else "بدون یوزرنیم"
                    
                    c.execute("""
                        INSERT OR IGNORE INTO members (tg_id, access_hash, username, name, status, source_group, scraped_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (user.id, user.access_hash or 0, username, full_name or "بدون نام", status_str, group_url, datetime.now().strftime("%Y-%m-%d %H:%M")))
                    total_extracted += 1
                    
                conn.commit()
                conn.close()
                
                offset += len(participants.users)
                add_log(f"تاکنون {total_extracted} عضو استخراج و ذخیره شد...", "info")
                
                delay = 1.0 if speed_mode.startswith("سریع") else 2.5
                await asyncio.sleep(delay)
                
            add_log(f"عملیات اسکرپ پایان یافت. مجموع استخراج: {total_extracted} کاربر.", "success")
            
        except Exception as e:
            add_log(f"خطا در اسکرپ تلگرام: {str(e)}", "error")
        finally:
            await client.disconnect()
            self.is_scraping = False

    def stop_scraping(self):
        if self.is_scraping:
            self.is_scraping = False
            add_log("دستور توقف اسکرپ ارسال شد.", "warning")

    async def add_members_to_group(self, target_group: str, max_count: int, delay_sec: float):
        self.is_adding = True
        add_log(f"🚀 شروع عملیات ادد کردن همگانی اعضا از دیتابیس به {target_group}...", "info")
        
        if not TELETHON_AVAILABLE:
            add_log("حالت شبیه‌سازی: شروع ادد کردن تستی اعضا به گروه...", "warning")
            for idx in range(1, min(max_count, 15) + 1):
                if not self.is_adding: break
                await asyncio.sleep(min(delay_sec, 1.5))
                add_log(f"کاربر کاربر_ذخیره_شده_{idx} با موفقیت به {target_group} ادد شد.", "success")
            self.is_adding = False
            add_log("عملیات ادد همگانی شبیه‌سازی شده به پایان رسید.", "success")
            return

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM members WHERE (is_added IS NULL OR is_added=0) AND status IN ('Active', 'Recently Seen', 'آنلاین', 'آخرین بازدید اخیراً') LIMIT ?", (max_count,))
        members_to_add = [dict(r) for r in c.fetchall()]
        
        c.execute("SELECT phone FROM accounts WHERE status='Active'")
        active_accounts = [r['phone'] for r in c.fetchall()]
        conn.close()

        if not members_to_add:
            add_log("هیچ کاربر جدید (ادد نشده) و فعالی در دیتابیس برای ادد کردن یافت نشد.", "error")
            self.is_adding = False
            return
            
        if not active_accounts:
            add_log("هیچ اکانت تلگرام متصل و فعالی جهت انجام ادد ممبر یافت نشد. ابتدا در تب اکانت‌ها لاگین کنید.", "error")
            self.is_adding = False
            return

        added_count = 0
        
        for idx, member in enumerate(members_to_add):
            if not self.is_adding: break
            
            phone = active_accounts[idx % len(active_accounts)]
            client = await self.get_client_for_account(phone)
            if not client: continue
            
            try:
                entity = await client.get_entity(target_group)
                user_to_invite = await client.get_input_entity(member['tg_id'])
                await client(InviteToChannelRequest(channel=entity, users=[user_to_invite]))
                added_count += 1
                add_log(f"✓ [{added_count}/{len(members_to_add)}] کاربر {member['name']} توسط اکانت {phone} ادد شد.", "success")
            except Exception as e:
                err_str = str(e)
                if "Privacy" in err_str:
                    add_log(f"کاربر {member['name']} تنظیمات حریم خصوصی (Privacy) دارد، ادد نشد.", "warning")
                elif "Flood" in err_str:
                    add_log(f"اکانت {phone} محدودیت ارسال گرفت (Flood Wait).", "error")
                else:
                    add_log(f"خطا در ادد کاربر {member['name']}: {err_str}", "info")
            finally:
                await client.disconnect()
                
            # علامت‌گذاری کاربر به عنوان پردازش شده تا هرگز دوباره ادد نشود
            conn2 = get_db()
            c2 = conn2.cursor()
            c2.execute("UPDATE members SET is_added=1 WHERE tg_id=?", (member['tg_id'],))
            conn2.commit()
            conn2.close()
                
            await asyncio.sleep(delay_sec)
            
        self.is_adding = False
        add_log(f"عملیات ادد همگانی پایان یافت. مجموع موفق: {added_count} نفر.", "success")

    def stop_adding(self):
        if self.is_adding:
            self.is_adding = False
            add_log("فرمان توقف عملیات ادد ممبر توسط کاربر ارسال شد.", "warning")

engine = TelegramEngine()
