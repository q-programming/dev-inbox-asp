import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { InboxItemDetail, IntegrationType, ItemSource } from '@api';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { translateItemType } from '@feature/inbox/utils/reason';
import { useNoteModalStore } from '@feature/notes/store/noteModal.store';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon';
import { useMemo } from 'react';

interface IInboxDetailHeader {
    details: InboxItemDetail;
    /** Link to the item on its origin platform (e.g. GitHub PR URL, ADO work item URL). Each source-specific detail component knows where to find it. */
    url?: string;
}

const SOURCE_INTEGRATION: Partial<Record<ItemSource, IntegrationType | string>> = {
    [ItemSource.Ado]: IntegrationType.Ado,
    [ItemSource.Github]: IntegrationType.Github,
    [ItemSource.Note]: 'note',
};

/**
 * Shared detail-panel header: integration icon + item type label, quick actions
 * (mark as done, save, open on origin platform, more, close) and the item title.
 * Rendered by each source-specific detail component (GithubDetail/AdoDetail/NoteDetail)
 * so it can supply the origin `url`, which lives on the nested `github`/`ado`/`note` DTO.
 */
const InboxDetailHeader = ({ details, url }: IInboxDetailHeader) => {
    const { closeItem } = useInboxStore();
    const openNoteModal = useNoteModalStore((state) => state.open);

    const integration = useMemo(
        () => (details.source ? SOURCE_INTEGRATION[details.source] ?? '' : ''),
        [details.source],
    );

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',

                    pl: {
                        xs: 2,
                        md: 1.5,
                    },

                    pr: 1,
                    py: 1,
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                >
                    <IntegrationIcon
                        integration={integration}
                        size={18}
                    />
                    <Typography
                        data-testid="inbox-detail-item-type-label"
                        data-item-type={details.itemType}
                        variant="overline"
                        sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}
                    >
                        {translateItemType(details.itemType)}
                    </Typography>
                </Stack>

                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: 'center' }}
                >
                    <IconButton
                        data-testid="inbox-detail-mark-done-btn"
                        size="small"
                        title={details.isDone ? 'Marked as done' : 'Mark as done'}
                        color={details.isDone ? 'success' : 'default'}
                    >
                        <CheckCircleOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        data-testid="inbox-detail-save-btn"
                        size="small"
                        title={details.isSaved ? 'Saved' : 'Save'}
                        color={details.isSaved ? 'primary' : 'default'}
                    >
                        <BookmarkBorderIcon fontSize="small" />
                    </IconButton>
                    {!!url && (
                        <IconButton
                            data-testid="inbox-detail-open-btn"
                            size="small"
                            title="Open item"
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <OpenInNewIcon fontSize="small" />
                        </IconButton>
                    )}
                    {details.source !== ItemSource.Note && !details.attachedNote && (
                        <IconButton
                            data-testid="inbox-detail-add-note-btn"
                            size="small"
                            title="Add note"
                            onClick={() => openNoteModal(details)}
                        >
                            <NoteAddOutlinedIcon fontSize="small" />
                        </IconButton>
                    )}
                    <IconButton
                        data-testid="inbox-detail-more-btn"
                        size="small"
                        title="More options"
                    >
                        <MoreHorizIcon fontSize="small" />
                    </IconButton>
                    <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ mx: 0.5, my: 0.75 }}
                    />
                    <IconButton
                        data-testid="inbox-detail-close-btn"
                        onClick={closeItem}
                        size="small"
                        title="Close"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            <Divider />

            <Box
                sx={{
                    px: { xs: 2, md: 3 },
                    pt: 2,
                }}
            >
                <Typography
                    data-testid="inbox-detail-title"
                    variant="h5"
                    sx={{ fontWeight: 700 }}
                >
                    {details.title}
                </Typography>
            </Box>
        </>
    );
};

export default InboxDetailHeader;
