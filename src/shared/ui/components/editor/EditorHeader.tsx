import "./editorHeader.css"

type Props = {
    creating: boolean,
    type: string,
}

export function EditorHeader({ creating, type }: Props) 
{
    return (
        <div className="editorHeader editorHeaderInline">
            <div>
                <div className="editorTitle">{creating ? `Nouveau ${type}` : `Modifier ${type}`}</div>
            </div>
        </div>
    );
}