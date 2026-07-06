import asyncio
from playwright.async_api import async_playwright
import os

OUTPUT_DIR = r'C:\Users\alokg\bill-by-billu\promo-images'
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMO_PATH = r"C:\Users\alokg\bill-by-billu\frontend\public\promo.html"
SCREENSHOTS_PATH = r"C:\Users\alokg\bill-by-billu\frontend\public\promo-screenshots.html"

def to_file_url(path):
    return 'file:///' + os.path.normpath(path).replace('\\', '/')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # ===== PROMO CARDS =====
        page = await browser.new_page(viewport={'width': 1400, 'height': 900})
        await page.goto(to_file_url(PROMO_PATH))
        await page.wait_for_timeout(1000)
        
        cards = await page.query_selector_all('.card')
        card_names = [
            '01-hero',
            '02-ai-invoice',
            '03-gst-reports',
            '04-pricing',
            '05-whatsapp-share',
            '06-languages',
            '07-upi-payments',
            '08-features-grid',
            '09-invoice-preview'
        ]
        
        for i, card in enumerate(cards):
            if i < len(card_names):
                box = await card.bounding_box()
                if box:
                    await card.screenshot(path=os.path.join(OUTPUT_DIR, f'{card_names[i]}.png'))
                    print(f'Saved: {card_names[i]}.png')
        
        # ===== PLAY STORE SCREENSHOTS =====
        page2 = await browser.new_page(viewport={'width': 1600, 'height': 1000})
        await page2.goto(to_file_url(SCREENSHOTS_PATH))
        await page2.wait_for_timeout(1000)
        
        # Feature Graphic
        fg = await page2.query_selector('.feature-graphic')
        if fg:
            await fg.screenshot(path=os.path.join(OUTPUT_DIR, 'playstore-feature-graphic.png'))
            print('Saved: playstore-feature-graphic.png')
        
        # Phone Screenshots
        phones = await page2.query_selector_all('.phone-screenshot')
        phone_names = [
            'playstore-screenshot-01-dashboard',
            'playstore-screenshot-02-ai-invoice',
            'playstore-screenshot-03-gst-reports',
            'playstore-screenshot-04-invoice-preview',
            'playstore-screenshot-05-settings'
        ]
        
        for i, phone in enumerate(phones):
            if i < len(phone_names):
                await phone.screenshot(path=os.path.join(OUTPUT_DIR, f'{phone_names[i]}.png'))
                print(f'Saved: {phone_names[i]}.png')
        
        await browser.close()
        print(f'\nAll images saved to: {OUTPUT_DIR}')

asyncio.run(main())
