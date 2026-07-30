export const authBrand = {
  name: 'Agri Trust',
  tagline: 'Agricultural finance portal',
}

export const authIllustration = {
  eyebrow: 'Rwanda · Agricultural finance',
  headline: 'Smarter lending for farmers and partners',
  body: 'Manage loans, review farmer profiles, and track mobile money — securely, in one place.',
  // Swap these for business-approved metrics (disbursed value, farmers onboarded,
  // partner banks live). Keep `value` under ~7 characters so both columns stay balanced.
  stats: [
    { value: '7', label: 'Partner roles supported' },
    { value: '256-bit', label: 'Encrypted in transit' },
  ],
}

export const authSecurity = {
  note: 'Encrypted session. Sign-in activity is logged and monitored.',
  supportPrompt: 'Need help signing in?',
  supportAction: 'Contact support',
  terms: 'Terms',
  privacy: 'Privacy',
  versionLabel: (version) => `v${version}`,
}

export const authLanguage = {
  label: 'Language',
  options: [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'rw', label: 'Kinyarwanda', short: 'RW' },
    { code: 'fr', label: 'Français', short: 'FR' },
  ],
}

export const loginCopy = {
  partnerEyebrow: 'Partner portal',
  partnerTitle: 'Welcome back',
  partnerSubtitle: 'Secure access for approved organizations and authorized staff.',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@company.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Your password',
  rememberMe: 'Keep me signed in',
  forgotPassword: 'Forgot password?',
  submit: 'Sign in',
  submitting: 'Signing in…',
  partnerAccessHelp: 'Access is invitation-only. Contact your organization administrator.',
  partnerEmailRequired: 'Enter your organization email address.',
  partnerOnly: 'Farmer accounts use the Agri Trust mobile app.',
  toastSuccess: 'Welcome back. You are now signed in.',
  toastError: 'Incorrect email or password. Please try again.',
  emailRequired: 'Enter your email address.',
  emailInvalid: 'Enter a valid email address, for example you@company.com.',
  passwordRequired: 'Enter your password.',
  capsLockOn: 'Caps Lock is on.',
  repeatedFailures:
    'Still not working? After a few more attempts your account is locked for 15 minutes — reset your password instead.',
  farmerPrompt: 'Are you a farmer?',
  farmerAction: 'Use the Agri Trust mobile app',
  reset: {
    title: 'Reset your password',
    description: 'Enter your email and we will send you a link to choose a new password.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@company.com',
    cancel: 'Cancel',
    submit: 'Send reset link',
    submitting: 'Sending…',
    toastMissingEmail: 'Please enter your email address.',
    toastSuccess: 'Check your inbox for reset instructions.',
    toastError: 'We could not send the reset email. Try again later.',
  },
}

export const passwordPolicyCopy = {
  strengthLabel: 'Password strength',
  levels: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'],
  requirementsTitle: 'Your password must have:',
  progress: (met, total) => `${met} of ${total} requirements met`,
  rules: {
    length: 'At least 8 characters',
    case: 'Upper and lower case letters',
    number: 'At least one number',
    symbol: 'At least one symbol, such as ! ? # or @',
    notCommon: 'No common words, repeats or your own name',
  },
  /** Chip labels — the full `rules` text stays as each chip's tooltip. */
  rulesShort: {
    length: '8+ characters',
    case: 'Upper + lower',
    number: 'Number',
    symbol: 'Symbol',
    notCommon: 'Not predictable',
  },
  allMet: 'Strong enough — all requirements met.',
  tooWeak: 'Your password does not meet all the requirements yet.',
  tipsTitle: 'Security tips',
  tips: [
    'Never reuse passwords across different websites.',
    'Use a password manager to generate and store unique passwords for every account.',
    'Enable two-factor authentication (2FA) whenever it is available.',
  ],
}

export const registerCopy = {
  title: 'Create a farmer account',
  subtitle: 'Partners and staff receive access from an administrator.',
  fullNameLabel: 'Full name',
  fullNamePlaceholder: 'e.g. Jean Baptiste',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@company.com',
  organizationLabel: 'Organization',
  organizationPlaceholder: 'Bank or company name',
  roleLabel: 'Account type',
  roles: {
    BANK: 'Bank partner',
    INSURER: 'Insurance partner',
    COOPERATIVE: 'Cooperative',
    FARMER: 'Farmer',
    INSPECTOR: 'Field inspector',
    GUARANTEE_OFFICER: 'Guarantee officer',
    REGISTRATION_OFFICER: 'Registration officer',
  },
  passwordLabel: 'Password',
  passwordPlaceholder: 'At least 8 characters',
  phoneLabel: 'Phone number',
  terms: 'I accept the Terms of Service and Privacy Policy.',
  submit: 'Create account',
  submitting: 'Creating account…',
  footerPrompt: 'Already have an account?',
  footerAction: 'Sign in',
  toastTerms: 'Please accept the terms and privacy policy to continue.',
  toastPasswordMin: 'Password must be at least 8 characters.',
  toastPhoneInvalid: 'Enter a valid Rwanda mobile number (+250 7XX XXX XXX).',
  toastSuccess: 'Your account was created. You can sign in now.',
  toastVerifyEmail: 'Account created. Check your email to verify before signing in.',
  toastError: 'Registration could not be completed. Please try again.',
}

export const forgotPasswordCopy = {
  title: 'Reset password',
  subtitle: 'Choose email or phone. Email sends a secure link; phone sends a 6-digit code via SMS.',
  partnerSubtitle: 'Enter your partner account email to receive a secure reset link.',
  partnerSentSubtitle: 'If the account exists, a secure reset link has been sent.',
  emailTab: 'Email',
  phoneTab: 'Phone',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@company.com',
  phoneLabel: 'Phone number',
  phonePlaceholder: '+250 7XX XXX XXX',
  sendLink: 'Send reset link',
  sendAnotherLink: 'Send another link',
  sendCode: 'Send reset code',
  sending: 'Sending…',
  updating: 'Updating…',
  resendIn: (seconds) => `Resend in ${seconds}s`,
  codeLabel: '6-digit code',
  codePlaceholder: 'Enter SMS code',
  newPasswordLabel: 'New password',
  newPasswordPlaceholder: 'At least 8 characters',
  confirmPasswordLabel: 'Confirm password',
  confirmPasswordPlaceholder: 'Re-enter password',
  updatePassword: 'Update password',
  backToSignIn: 'Back to sign in',
  emailSent: 'Check your inbox for a reset link (and spam folder).',
  codeSent: 'Enter the code we sent to your phone.',
  devCode: (code) => `Dev code: ${code}`,
  invalidEmail: 'Enter a valid email address.',
  invalidPhone: 'Enter a valid Rwanda mobile number (+250 7…).',
  passwordMin: 'Password must be at least 8 characters.',
  passwordMismatch: 'Passwords do not match.',
  passwordUpdated: 'Your password was updated. You can sign in now.',
  resetFailed: 'Could not complete password reset. Please try again.',
  smsFailed: 'Could not send SMS. Try email reset or try again later.',
}

export const verifyEmailCopy = {
  title: 'Verify your email',
  verifying: 'Verifying your email address…',
  success: 'Your email is verified. You can sign in now.',
  failed: 'This verification link is invalid or has expired.',
  missingLink: 'No verification token was provided.',
  backToSignIn: 'Back to sign in',
}

export const resetPasswordCopy = {
  title: 'New password',
  subtitle: 'Choose a strong new password for your account.',
  invalidLink: 'This reset link is invalid or has expired.',
  requestNew: 'Request a new reset',
  newPasswordLabel: 'New password',
  newPasswordPlaceholder: 'Mix letters, numbers and a symbol',
  confirmPasswordLabel: 'Confirm password',
  confirmPasswordPlaceholder: 'Re-enter password',
  updatePassword: 'Update password',
  updating: 'Updating…',
  validating: 'Checking your reset link…',
  passwordMin: 'Password must be at least 8 characters.',
  passwordMismatch: 'Passwords do not match.',
  passwordUpdated: 'Your password was updated. You can sign in now.',
  resetFailed: 'Could not reset password. Please try again.',
  backToSignIn: 'Back to sign in',
}

/** English is the source of truth; other locales fall back to it key by key. */
export const authCopyEn = {
  brand: authBrand,
  illustration: authIllustration,
  security: authSecurity,
  language: authLanguage,
  passwordPolicy: passwordPolicyCopy,
  login: loginCopy,
  register: registerCopy,
  forgotPassword: forgotPasswordCopy,
  verifyEmail: verifyEmailCopy,
  resetPassword: resetPasswordCopy,
}
