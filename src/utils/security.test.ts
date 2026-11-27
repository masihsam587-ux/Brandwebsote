import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  isValidAdminHash,
  maskPhone,
  sanitizeExternalUrl,
  sanitizePlainText,
  sanitizeUrlPath,
  validateSafeSlug,
} from './security';
import {
  checkoutSchema,
  passwordPolicySchema,
  signupUserSchema,
  urlSlugSchema,
} from './validation';

test('sanitizeUrlPath blocks open redirects and protocol schemes', () => {
  assert.equal(sanitizeUrlPath('/orders'), '/orders');
  assert.equal(sanitizeUrlPath('/shop?category=jackets'), '/shop?category=jackets');
  assert.equal(sanitizeUrlPath('https://evil.com/phish'), '/profile');
  assert.equal(sanitizeUrlPath('//evil.com'), '/profile');
  assert.equal(sanitizeUrlPath('/\\evil.com'), '/profile');
  const scriptScheme = 'java' + 'script:alert(1)';
  assert.equal(sanitizeUrlPath(scriptScheme), '/profile');
  assert.equal(sanitizeUrlPath(null, '/shop'), '/shop');
});

test('sanitizeExternalUrl allows only https, mailto, tel, or internal paths', () => {
  const scriptScheme = 'java' + 'script:alert(1)';
  assert.equal(sanitizeExternalUrl('https://wa.me/923355329722'), 'https://wa.me/923355329722');
  assert.equal(sanitizeExternalUrl('mailto:cinematicartsofficial.io@gmail.com'), 'mailto:cinematicartsofficial.io@gmail.com');
  assert.equal(sanitizeExternalUrl('tel:03355329722'), 'tel:03355329722');
  assert.equal(sanitizeExternalUrl(scriptScheme), '#');
  assert.equal(sanitizeExternalUrl('http://insecure.example.com'), '#');
});

test('sanitizePlainText strips HTML tags and normalizes whitespace', () => {
  assert.equal(
    sanitizePlainText('  <script>alert(1)</script>Hello   <b>World</b>  ', 50),
    'alert(1)Hello World'
  );
  assert.equal(sanitizePlainText('<b>Name</b>', 20), 'Name');
});

test('maskPhone masks middle digits of customer numbers', () => {
  assert.equal(maskPhone('03355329722'), '0335••••722');
  assert.equal(maskPhone('123'), '••••');
  assert.equal(maskPhone(''), '—');
});

test('evaluatePasswordStrength and passwordPolicySchema enforce 8+ chars and mixed characters', () => {
  const weak = evaluatePasswordStrength('abc');
  assert.equal(weak.checks.minLength, false);

  const strong = evaluatePasswordStrength('Artisan2026!');
  assert.equal(strong.score, 4);
  assert.equal(strong.label, 'Strong');

  assert.equal(passwordPolicySchema.safeParse('short1').success, false);
  assert.equal(passwordPolicySchema.safeParse('onlyletters').success, false);
  assert.equal(passwordPolicySchema.safeParse('ValidPass9').success, true);

  assert.equal(
    signupUserSchema.safeParse({
      role: 'user',
      name: 'Zainab Khan',
      email: 'zainab@example.com',
      password: 'ValidPass9',
    }).success,
    true
  );
});

test('urlSlugSchema and validateSafeSlug reject path traversal or invalid characters', () => {
  assert.equal(validateSafeSlug('womens-unstitched-3pc-101'), true);
  assert.equal(validateSafeSlug('../admin'), false);
  assert.equal(validateSafeSlug('bad<script>'), false);
  assert.equal(urlSlugSchema.safeParse('boys-chino-trouser-102').success, true);
  assert.equal(urlSlugSchema.safeParse('bad slug!').success, false);
});

test('checkoutSchema enforces referral ID only when paymentMethod is installments', () => {
  const cod = checkoutSchema.safeParse({
    fullName: 'Amina Tariq',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'House 14, University Town',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'cod',
    referralCode: '',
  });
  assert.equal(cod.success, true);

  const instNoRef = checkoutSchema.safeParse({
    fullName: 'Amina Tariq',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'House 14, University Town',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'installments',
    referralCode: '',
  });
  assert.equal(instNoRef.success, false);

  const instGood = checkoutSchema.safeParse({
    fullName: 'Amina Tariq',
    phone: '03355329722',
    whatsapp: '03355329722',
    address: 'House 14, University Town',
    city: 'Peshawar',
    postalCode: '25000',
    paymentMethod: 'installments',
    referralCode: 'CA-102938',
  });
  assert.equal(instGood.success, true);
});

test('isValidAdminHash strictly detects #admin hash suffix', () => {
  assert.equal(isValidAdminHash('#admin'), true);
  assert.equal(isValidAdminHash('#ADMIN'), true);
  assert.equal(isValidAdminHash('#other'), false);
});
