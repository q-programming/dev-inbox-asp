import { InboxItemDetail } from "@api";

interface INoteDetail {
    details: InboxItemDetail;
}
const NoteDetail = ({ details }: INoteDetail) => {
    return (
        <div>
            NOTE DETAIL
            {details.source}
        </div>
    );
};

export default NoteDetail;