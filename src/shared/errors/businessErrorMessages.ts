import {
  isEmailRateLimitMessage,
  humanEmailRateLimitMessage,
} from "./emailRateLimit";

export function humanBusinessMessage(msg: string): string | null {
  const m = msg.trim();

  // ------------------------------------------------------------------
  // Exact matches
  // ------------------------------------------------------------------

  const exactMessages: Record<string, string> = {
    PLAN_LIMIT_REGISTRATIONS_PER_EVENT:
      "Limite du nombre d’inscriptions par événement atteinte pour votre abonnement actuel.",

    PLAN_LIMIT_PAID_EVENTS_PER_YEAR:
      "Plan gratuit : limite d’événements avec tickets payants atteinte pour cette année. Passez sur Starter pour continuer.",

    PLAN_LIMIT:
      "Limite de votre abonnement atteinte. Passez sur un plan supérieur pour continuer.",

    FORBIDDEN:
      "Accès refusé : vous n'avez pas les droits nécessaires.",

    NOT_AUTHENTICATED:
      "Votre session a expiré. Reconnectez-vous.",

    EVENT_MISMATCH:
      "Ce ticket n’est pas lié à cet événement.",

    TICKET_NOT_FOUND:
      "Ticket introuvable.",

    TICKET_CANCELLED:
      "Ce ticket a été annulé.",

    TICKET_INVALID:
      "Ce ticket est invalide.",

    CONFLICT:
      "Vous avez déjà créé une organisation.",

    ORG_ALREADY_EXISTS:
      "Vous avez déjà créé une organisation.",
  };

  const exact = exactMessages[m];
  if (exact) return exact;

  // ------------------------------------------------------------------
  // Validation messages
  // ------------------------------------------------------------------

  const regexMessages: Array<[RegExp, string]> = [
    [
      /VALIDATION_ERROR:\s*type is required/i,
      "Veuillez choisir un type d’organisation.",
    ],

    [
      /VALIDATION_ERROR:\s*invalid type/i,
      "Le type d’organisation est invalide.",
    ],

    [
      /VALIDATION_ERROR:\s*name is required/i,
      "Veuillez indiquer le nom de l’organisation.",
    ],

    [
      /VALIDATION_ERROR:\s*name must be between 3 and 120 characters/i,
      "Le nom doit contenir entre 3 et 120 caractères.",
    ],

    [
      /VALIDATION_ERROR:\s*org_id is required/i,
      "Organisation introuvable.",
    ],

    [
      /VALIDATION_ERROR:\s*name cannot be empty/i,
      "Le nom de l’organisation est obligatoire.",
    ],

    [
      /VALIDATION_ERROR:\s*name too short/i,
      "Le nom doit contenir au moins 3 caractères.",
    ],

    [
      /VALIDATION_ERROR:\s*name too long/i,
      "Le nom ne peut pas dépasser 120 caractères.",
    ],

    [
      /VALIDATION_ERROR:\s*description too long/i,
      "La description ne peut pas dépasser 1000 caractères.",
    ],

    [
      /VALIDATION_ERROR:\s*public_email too long/i,
      "L’adresse email publique est trop longue.",
    ],

    [
      /VALIDATION_ERROR:\s*phone too short/i,
      "Le numéro de téléphone est trop court.",
    ],

    [
      /VALIDATION_ERROR:\s*phone too long/i,
      "Le numéro de téléphone est trop long.",
    ],

    [
      /VALIDATION_ERROR:\s*website too short/i,
      "L’URL du site web est trop courte.",
    ],

    [
      /VALIDATION_ERROR:\s*website too long/i,
      "L’URL du site web est trop longue.",
    ],

    [
      /VALIDATION_ERROR:\s*email_reminder_days_before must be >= 0/i,
      "Le délai de rappel email ne peut pas être négatif.",
    ],

    [
      /MOLLIE_PAYMENT_CREATE_FAILED|payment method is not activated/i,
      "Le mode de paiement sélectionné n’est pas encore activé sur le compte Mollie. Activez-le dans Mollie ou choisissez un autre moyen de paiement.",
    ],

    [
      /Edge Function returned a non-2xx status code/i,
      "Une erreur serveur est survenue pendant la réservation. Veuillez réessayer dans quelques instants.",
    ],
  ];

  for (const [regex, message] of regexMessages) {
    if (regex.test(m)) {
      return message;
    }
  }

  if (isEmailRateLimitMessage(m)) {
    return humanEmailRateLimitMessage();
  }

  return null;
}