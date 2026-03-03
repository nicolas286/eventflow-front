import { Link } from "react-router-dom"

export type NoticeProps = {
    key: string,
    title: string,
    body: string,
    to: string,
    cta: string
}

export function Notice({key, title, body, to, cta} : NoticeProps) {
    return (
        <div key={key} className="adminNotice">
          <div className="adminNoticeText">
            <div className="adminNoticeTitle">{title}</div>
            <div className="adminNoticeBody">{body}</div>
          </div>

          <Link className="adminNoticeCta" to={to}>
            {cta}
          </Link>
        </div>
    );
}