/**
 * Locale overrides for the auth screens.
 *
 * NOTE: the Kinyarwanda and French strings below are a first pass and have NOT been
 * reviewed by a native speaker. Get them signed off before a public launch.
 *
 * Any key omitted here falls back to the English string, so partial translations are safe.
 */
import { authCopyEn } from './authCopy'

export const DEFAULT_AUTH_LOCALE = 'en'
export const SUPPORTED_AUTH_LOCALES = ['en', 'rw', 'fr']

const rw = {
  brand: {
    tagline: "Urubuga rw'imari y'ubuhinzi",
  },
  illustration: {
    eyebrow: "U Rwanda · Imari y'ubuhinzi",
    headline: "Inguzanyo nziza ku bahinzi n'abafatanyabikorwa",
    body: "Genzura inguzanyo, reba amakuru y'abahinzi, kandi ukurikirane amafaranga ya mobile money — mu mutekano, ahantu hamwe.",
    stats: [
      { value: '7', label: "Inshingano z'abafatanyabikorwa" },
      { value: '256-bit', label: 'Bibitswe mu ibanga' },
    ],
  },
  security: {
    note: 'Umurongo ufite umutekano. Kwinjira kwose birabikwa kandi bigenzurwa.',
    supportPrompt: 'Ukeneye ubufasha kwinjira?',
    supportAction: "Vugana n'ubufasha",
    support: 'Ubufasha',
    terms: 'Amabwiriza',
    privacy: 'Ibanga',
  },
  language: {
    label: 'Ururimi',
  },
  passwordPolicy: {
    strengthLabel: 'Imbaraga z’ijambobanga',
    levels: ['Ridakomeye na gato', 'Ridakomeye', 'Rihagije', 'Rikomeye', 'Rikomeye cyane'],
    requirementsTitle: 'Ijambobanga rigomba kugira:',
    progress: (met, total) => `Ibisabwa ${met} kuri ${total} byujujwe`,
    rules: {
      length: 'Nibura inyuguti 8',
      case: 'Inyuguti nkuru n’into',
      number: 'Nibura umubare umwe',
      symbol: 'Nibura ikimenyetso, nka ! ? # cyangwa @',
      notCommon: 'Nta magambo asanzwe, asubiramo cyangwa izina ryawe',
    },
    rulesShort: {
      length: 'Inyuguti 8+',
      case: 'Nkuru + nto',
      number: 'Umubare',
      symbol: 'Ikimenyetso',
      notCommon: 'Ntibyoroshye kumenya',
    },
    allMet: 'Rikomeye bihagije — ibisabwa byose byujujwe.',
    tooWeak: 'Ijambobanga ryawe ntiryujuje ibisabwa byose.',
    tipsTitle: 'Inama z’umutekano',
    tips: [
      'Ntukongere ukoreshe ijambobanga rimwe ku rubuga runtandukanye.',
      'Koresha porogaramu yo kubika amajambobanga kugira ngo ukore kandi ubike ajya ku konti yose.',
      'Koresha uburyo bwa kabiri bwo kwemeza (2FA) iyo bubonetse.',
    ],
  },
  login: {
    partnerEyebrow: "Urubuga rw'abafatanyabikorwa",
    partnerTitle: 'Murakaza neza',
    partnerSubtitle: "Uburyo bufite umutekano bw'ibigo byemewe n'abakozi babifitiye uburenganzira.",
    emailLabel: 'Aderesi ya imeyili',
    passwordLabel: 'Ijambobanga',
    passwordPlaceholder: 'Ijambobanga ryawe',
    rememberMe: 'Nkomeze kwinjira',
    forgotPassword: 'Wibagiwe ijambobanga?',
    submit: 'Injira',
    submitting: 'Kwinjira…',
    partnerAccessHelp: "Kwinjira ni ku batumiwe gusa. Vugana n'umuyobozi w'ikigo cyawe.",
    partnerEmailRequired: "Andika aderesi ya imeyili y'ikigo cyawe.",
    partnerOnly: "Konti z'abahinzi zikoresha porogaramu ya Agri Trust kuri telefoni.",
    toastSuccess: 'Murakaza neza. Winjiye neza.',
    toastError: 'Imeyili cyangwa ijambobanga sibyo. Ongera ugerageze.',
    emailRequired: 'Andika aderesi ya imeyili yawe.',
    emailInvalid: 'Andika aderesi ya imeyili nyayo, urugero we@ikigo.com.',
    passwordRequired: 'Andika ijambobanga ryawe.',
    capsLockOn: 'Caps Lock irakora.',
    repeatedFailures:
      "Ntibikunda? Nyuma y'igerageza rike, konti yawe izafungwa iminota 15 — ahubwo hindura ijambobanga.",
    farmerPrompt: 'Uri umuhinzi?',
    farmerAction: 'Koresha porogaramu ya Agri Trust',
  },
  forgotPassword: {
    title: 'Hindura ijambobanga',
    partnerSubtitle: 'Andika imeyili ya konti yawe kugira uhabwe umuyoboro ufite umutekano.',
    partnerSentSubtitle: 'Niba konti ibaho, umuyoboro wo guhindura woherejwe.',
    emailLabel: 'Aderesi ya imeyili',
    sendLink: 'Ohereza umuyoboro',
    sendAnotherLink: 'Ohereza undi muyoboro',
    sending: 'Kohereza…',
    backToSignIn: 'Subira ku kwinjira',
    emailSent: 'Reba imeyili yawe (na spam).',
    invalidEmail: 'Andika aderesi ya imeyili nyayo.',
    resetFailed: 'Guhindura ijambobanga ntibyakunze. Ongera ugerageze.',
  },
  resetPassword: {
    title: 'Ijambobanga rishya',
    subtitle: 'Hitamo ijambobanga rishya rikomeye.',
    invalidLink: 'Uyu muyoboro ntiwemewe cyangwa warangiye.',
    requestNew: 'Saba undi muyoboro',
    newPasswordLabel: 'Ijambobanga rishya',
    newPasswordPlaceholder: 'Vanga inyuguti, imibare n’ikimenyetso',
    confirmPasswordLabel: 'Emeza ijambobanga',
    confirmPasswordPlaceholder: 'Ongera wandike ijambobanga',
    updatePassword: 'Hindura ijambobanga',
    updating: 'Guhindura…',
    validating: 'Kugenzura umuyoboro…',
    passwordMin: 'Ijambobanga rigomba kuba nibura inyuguti 8.',
    passwordMismatch: 'Amagambobanga ntahura.',
    passwordUpdated: 'Ijambobanga ryawe ryahinduwe. Ushobora kwinjira.',
    resetFailed: 'Guhindura ijambobanga ntibyakunze. Ongera ugerageze.',
    backToSignIn: 'Subira ku kwinjira',
  },
  verifyEmail: {
    title: 'Emeza imeyili yawe',
    verifying: 'Kugenzura aderesi ya imeyili yawe…',
    success: 'Imeyili yawe yemejwe. Ushobora kwinjira.',
    failed: 'Uyu muyoboro wo kwemeza ntiwemewe cyangwa warangiye.',
    missingLink: 'Nta kimenyetso cyo kwemeza cyatanzwe.',
    backToSignIn: 'Subira ku kwinjira',
  },
}

const fr = {
  brand: {
    tagline: 'Portail de financement agricole',
  },
  illustration: {
    eyebrow: 'Rwanda · Financement agricole',
    headline: 'Un crédit plus intelligent pour les agriculteurs et les partenaires',
    body: 'Gérez les prêts, consultez les profils des agriculteurs et suivez les paiements mobile money — en toute sécurité, au même endroit.',
    stats: [
      { value: '7', label: 'Rôles partenaires pris en charge' },
      { value: '256-bit', label: 'Chiffré en transit' },
    ],
  },
  security: {
    note: 'Session chiffrée. Les connexions sont enregistrées et surveillées.',
    supportPrompt: 'Besoin d’aide pour vous connecter ?',
    supportAction: 'Contacter le support',
    support: 'Support',
    terms: 'Conditions',
    privacy: 'Confidentialité',
  },
  language: {
    label: 'Langue',
  },
  passwordPolicy: {
    strengthLabel: 'Robustesse du mot de passe',
    levels: ['Très faible', 'Faible', 'Moyen', 'Robuste', 'Très robuste'],
    requirementsTitle: 'Votre mot de passe doit contenir :',
    progress: (met, total) => `${met} exigence(s) sur ${total} remplie(s)`,
    rules: {
      length: 'Au moins 8 caractères',
      case: 'Des majuscules et des minuscules',
      number: 'Au moins un chiffre',
      symbol: 'Au moins un symbole, par exemple ! ? # ou @',
      notCommon: 'Aucun mot courant, répétition ou votre propre nom',
    },
    rulesShort: {
      length: '8+ caractères',
      case: 'Maj + min',
      number: 'Chiffre',
      symbol: 'Symbole',
      notCommon: 'Non prévisible',
    },
    allMet: 'Assez robuste — toutes les exigences sont remplies.',
    tooWeak: 'Votre mot de passe ne remplit pas encore toutes les exigences.',
    tipsTitle: 'Conseils de sécurité',
    tips: [
      'Ne réutilisez jamais le même mot de passe sur plusieurs sites.',
      'Utilisez un gestionnaire de mots de passe pour créer et stocker un mot de passe unique pour chaque compte.',
      'Activez l’authentification à deux facteurs (2FA) dès qu’elle est disponible.',
    ],
  },
  login: {
    partnerEyebrow: 'Portail partenaire',
    partnerTitle: 'Bon retour',
    partnerSubtitle: 'Accès sécurisé pour les organisations agréées et le personnel autorisé.',
    emailLabel: 'Adresse e-mail',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Votre mot de passe',
    rememberMe: 'Rester connecté',
    forgotPassword: 'Mot de passe oublié ?',
    submit: 'Se connecter',
    submitting: 'Connexion…',
    partnerAccessHelp:
      'L’accès est sur invitation uniquement. Contactez l’administrateur de votre organisation.',
    partnerEmailRequired: 'Saisissez l’adresse e-mail de votre organisation.',
    partnerOnly: 'Les comptes agriculteurs utilisent l’application mobile Agri Trust.',
    toastSuccess: 'Bon retour. Vous êtes connecté.',
    toastError: 'E-mail ou mot de passe incorrect. Veuillez réessayer.',
    emailRequired: 'Saisissez votre adresse e-mail.',
    emailInvalid: 'Saisissez une adresse e-mail valide, par exemple vous@entreprise.com.',
    passwordRequired: 'Saisissez votre mot de passe.',
    capsLockOn: 'La touche Verr. Maj est activée.',
    repeatedFailures:
      'Toujours bloqué ? Après quelques tentatives supplémentaires, votre compte sera verrouillé pendant 15 minutes — réinitialisez plutôt votre mot de passe.',
    farmerPrompt: 'Vous êtes agriculteur ?',
    farmerAction: 'Utilisez l’application mobile Agri Trust',
  },
  forgotPassword: {
    title: 'Réinitialiser le mot de passe',
    partnerSubtitle:
      'Saisissez l’e-mail de votre compte partenaire pour recevoir un lien sécurisé.',
    partnerSentSubtitle: 'Si le compte existe, un lien de réinitialisation sécurisé a été envoyé.',
    emailLabel: 'Adresse e-mail',
    sendLink: 'Envoyer le lien',
    sendAnotherLink: 'Envoyer un autre lien',
    sending: 'Envoi…',
    backToSignIn: 'Retour à la connexion',
    emailSent: 'Consultez votre boîte de réception (et vos spams).',
    invalidEmail: 'Saisissez une adresse e-mail valide.',
    resetFailed: 'La réinitialisation a échoué. Veuillez réessayer.',
  },
  resetPassword: {
    title: 'Nouveau mot de passe',
    subtitle: 'Choisissez un nouveau mot de passe robuste.',
    invalidLink: 'Ce lien de réinitialisation est invalide ou a expiré.',
    requestNew: 'Demander un nouveau lien',
    newPasswordLabel: 'Nouveau mot de passe',
    newPasswordPlaceholder: 'Mélangez lettres, chiffres et un symbole',
    confirmPasswordLabel: 'Confirmer le mot de passe',
    confirmPasswordPlaceholder: 'Ressaisissez le mot de passe',
    updatePassword: 'Mettre à jour',
    updating: 'Mise à jour…',
    validating: 'Vérification du lien…',
    passwordMin: 'Le mot de passe doit contenir au moins 8 caractères.',
    passwordMismatch: 'Les mots de passe ne correspondent pas.',
    passwordUpdated: 'Votre mot de passe a été mis à jour. Vous pouvez vous connecter.',
    resetFailed: 'La réinitialisation a échoué. Veuillez réessayer.',
    backToSignIn: 'Retour à la connexion',
  },
  verifyEmail: {
    title: 'Vérifiez votre e-mail',
    verifying: 'Vérification de votre adresse e-mail…',
    success: 'Votre e-mail est vérifié. Vous pouvez vous connecter.',
    failed: 'Ce lien de vérification est invalide ou a expiré.',
    missingLink: 'Aucun jeton de vérification n’a été fourni.',
    backToSignIn: 'Retour à la connexion',
  },
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Overrides win, but every key missing from `overrides` keeps its English value. */
function mergeCopy(base, overrides) {
  if (!isPlainObject(base) || !isPlainObject(overrides)) return overrides ?? base

  const merged = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = isPlainObject(base[key]) ? mergeCopy(base[key], value) : value
  }
  return merged
}

export const authCopyByLocale = {
  en: authCopyEn,
  rw: mergeCopy(authCopyEn, rw),
  fr: mergeCopy(authCopyEn, fr),
}

export function getAuthCopy(locale) {
  return authCopyByLocale[locale] || authCopyByLocale[DEFAULT_AUTH_LOCALE]
}
