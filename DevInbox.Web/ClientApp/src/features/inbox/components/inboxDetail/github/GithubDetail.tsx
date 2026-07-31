import { InboxItemDetail } from "@api";

interface IGithubDetail {
    details: InboxItemDetail;
}
const GithubDetail = ({ details }: IGithubDetail) => {
    return (
        <div>
            GITHUB DETAIL
            {details.source}
        </div>
    );
};

export default GithubDetail;