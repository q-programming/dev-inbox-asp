import { InboxItemDetail } from "@api";

interface IAdoDetail {
    details: InboxItemDetail;
}
const AdoDetail = ({ details }: IAdoDetail) => {
    return (
        <div>
            ADO DETAIL
            {details.source}
        </div>
    );
};

export default AdoDetail;