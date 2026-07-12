import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const ORG = 'gymkhana-fitness-360';
const AVATAR = '/Users/dchatterjee/Desktop/gymkhana-opensource/org-profile/profile/gymkhana-org-avatar.png';
const SETTINGS_URL = `https://github.com/organizations/${ORG}/settings/profile`;
const ORG_URL = `https://github.com/${ORG}`;

async function getAvatarUrl(page) {
  const img = page.locator(`a[href="/${ORG}"] img, img[alt="@${ORG}"], img[alt="${ORG}"]`).first();
  if (await img.count()) {
    const src = await img.getAttribute('src');
    if (src) return src;
  }
  const headerImg = page.locator('img.avatar, img[class*="avatar"]').first();
  if (await headerImg.count()) return await headerImg.getAttribute('src');
  return null;
}

async function isLoginPage(page) {
  const url = page.url();
  if (url.includes('/login')) return true;
  const signIn = page.getByRole('heading', { name: /sign in/i });
  return (await signIn.count()) > 0;
}

async function tryUpload(page) {
  await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  if (await isLoginPage(page)) {
    return { status: 'login_required', url: page.url() };
  }

  const title = await page.title();
  if (/not found|404/i.test(title)) {
    return { status: 'not_found', url: page.url(), title };
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (!(await fileInput.count())) {
    const uploadLink = page.getByRole('link', { name: /upload new picture/i });
    const uploadButton = page.getByRole('button', { name: /upload new picture/i });
    if (await uploadLink.count()) await uploadLink.click();
    else if (await uploadButton.count()) await uploadButton.click();
    await page.waitForTimeout(1000);
  }

  const input = page.locator('input[type="file"]').first();
  if (!(await input.count())) {
    await page.screenshot({ path: '/tmp/gh-org-avatar-no-input.png', fullPage: true });
    return {
      status: 'no_upload_control',
      url: page.url(),
      title,
      screenshot: '/tmp/gh-org-avatar-no-input.png',
    };
  }

  await input.setInputFiles(AVATAR);
  await page.waitForTimeout(2000);

  const updateProfile = page.getByRole('button', { name: /update profile/i });
  if (await updateProfile.count()) {
    await updateProfile.click();
    await page.waitForTimeout(3000);
  }

  const save = page.getByRole('button', { name: /^save$/i });
  if (await save.count()) {
    await save.click();
    await page.waitForTimeout(3000);
  }

  await page.goto(ORG_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const avatarUrl = await getAvatarUrl(page);
  await page.screenshot({ path: '/tmp/gh-org-avatar-result.png', fullPage: true });

  return {
    status: avatarUrl ? 'success' : 'uploaded_unverified',
    url: page.url(),
    avatarUrl,
    screenshot: '/tmp/gh-org-avatar-result.png',
  };
}

const chromeProfile = `${process.env.HOME}/Library/Application Support/Google/Chrome`;
let context;
let mode = 'ephemeral';

try {
  if (existsSync(chromeProfile)) {
    mode = 'chrome-profile';
    context = await chromium.launchPersistentContext(chromeProfile, {
      headless: true,
      channel: 'chrome',
      args: ['--profile-directory=Default'],
    });
  } else {
    const browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
  }

  const page = context.pages()[0] || (await context.newPage());
  const result = await tryUpload(page);
  console.log(JSON.stringify({ mode, ...result }, null, 2));
} catch (error) {
  console.log(
    JSON.stringify(
      {
        status: 'error',
        mode,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  if (context) await context.close();
}
