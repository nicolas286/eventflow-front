import MarkdownText from "@shared/ui/components/markdowntext/MarkdownText"
import { SendIcon, PhoneIcon, GlobeIcon } from "@shared/ui/components/icon/Icons"
import "./PublicOrgHero.css";

type Props = {
    logoUrl : string | null;
    displayName: string | null;
    description: string | null;
    publicEmail: string | null;
    phone: string | null;
    website: string | null;
}

export function PublicOrgHero({logoUrl, displayName, description, publicEmail, phone, website}: Props)
{
    return (
        <div className="publicSurface">
            <div className="publicHero">
            <div className="publicBrand">
                {logoUrl ? (
                <img src={logoUrl} alt={displayName ?? "Logo de l'organisation"} className="publicLogo" />
                ) : null}

                <div className="publicOrgHeroRight">
                <div className="publicTitleBlock">
                    <h1 className="publicTitle">{displayName}</h1>
                </div>

                {description ? (
                    <MarkdownText markdown={description} className="publicProse" />
                ) : (
                    <div className="publicEmpty">Cette organisation n’a pas encore de description.</div>
                )}


                </div>
            </div>
            </div>
            

            <div className="publicDivider" />
            <div className="publicActions">

                {publicEmail ? (
                <div className="publicMail">
                    <a href={`mailto:${publicEmail}`}>
                    <SendIcon /> {publicEmail}
                    </a>
                </div>
                ) : null}

                {phone ? (
                <div className="publicPhone">
                    <a href={`tel:${phone}`}>
                    <PhoneIcon /> {phone}
                    </a>
                </div>
                ) : null}

                {website ? (
                <div className="publicSite">
                    <a href={website} target="_blank" rel="noreferrer">
                    <GlobeIcon /> {website}
                    </a>
                </div>
                ) : null}

            </div>
        </div>
    );
}