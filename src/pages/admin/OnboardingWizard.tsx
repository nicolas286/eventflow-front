import { useState } from "react";
import "../../styles/onboardingWizard.css";

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);

  return (
    <div className="onboardingPage">
      <div className="onboardingCard">
        <h1>Bienvenue 👋</h1>
        <p>Configurons votre espace en quelques étapes.</p>

        <div className="onboardingSteps">
          <strong>Étape {step} / 3</strong>
        </div>

        {step === 1 && (
          <div className="onboardingStep">
            <h2>Votre profil</h2>
            <p>(placeholder)</p>
            <input placeholder="Nom" disabled />
            <input placeholder="Email" disabled />
          </div>
        )}

        {step === 2 && (
          <div className="onboardingStep">
            <h2>Votre organisation</h2>
            <p>(placeholder)</p>
            <input placeholder="Nom de l’organisation" disabled />
          </div>
        )}

        {step === 3 && (
          <div className="onboardingStep">
            <h2>Premier événement</h2>
            <p>(placeholder)</p>
            <input placeholder="Nom de l’événement" disabled />
          </div>
        )}

        <div className="onboardingActions">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)}>
              Précédent
            </button>
          )}

          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)}>
              Suivant
            </button>
          ) : (
            <button disabled>Terminer</button>
          )}
        </div>
      </div>
    </div>
  );
}
