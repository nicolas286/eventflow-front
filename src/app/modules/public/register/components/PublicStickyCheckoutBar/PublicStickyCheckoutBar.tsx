import Button from "@ui/components/button/Button";
import { formatMoney } from "@shared/helpers/normalize";
import "./PublicStickyCheckoutBar.css";

type Props = {
  amountCents: number;
  currency: string;
  primaryText: string;
  secondaryText?: string;
  ctaLabel?: string;
  onClick: () => void;
  disabled?: boolean;
};

export function PublicStickyCheckoutBar({
  amountCents,
  currency,
  primaryText,
  secondaryText,
  ctaLabel = "Continuer →",
  onClick,
  disabled = false,
}: Props) {
  return (
    <div className="publicStickyCheckoutBar">
      <div className="publicStickyCheckoutMeta">
        <div className="publicStickyCheckoutPrice">
          {formatMoney(amountCents, currency)}
        </div>

        <div className="publicStickyCheckoutText">
          {primaryText}
        </div>

        {secondaryText ? (
          <div className="publicStickyCheckoutSubtext">
            {secondaryText}
          </div>
        ) : null}
      </div>

      <Button
        label={ctaLabel}
        onClick={onClick}
        disabled={disabled}
        className="publicStickyCheckoutButton"
      />
    </div>
  );
}