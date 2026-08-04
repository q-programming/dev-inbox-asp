import { InboxItemDetail, PersonReference, ReviewState } from "@api";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { formatRelativeTime } from "@utils/date";
import { REASON_CHIP_COLOR, translateInboxReason } from "@feature/inbox/utils/reason";
import InboxDetailHeader from "../InboxDetailHeader";

interface IGithubDetail {
    details: InboxItemDetail;
}

/** Colour of the small review-state dot shown next to each reviewer. */
const REVIEW_STATE_COLOR: Record<ReviewState, string> = {
    [ReviewState.Approved]: "success.main",
    [ReviewState.ChangesRequested]: "error.main",
    [ReviewState.Commented]: "info.main",
    [ReviewState.Waiting]: "text.disabled",
};

/** Builds up-to-two-letter initials from a display name, for avatar fallbacks. */
const initials = (name?: string): string =>
    name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") ?? "?";

const PersonAvatar = ({ person, size = 32 }: { person?: PersonReference; size?: number }) => (
    <Avatar
        src={person?.avatarUrl ?? undefined}
        sx={{ width: size, height: size, fontSize: size * 0.4 }}
    >
        {initials(person?.displayName)}
    </Avatar>
);

const GithubDetail = ({ details }: IGithubDetail) => {
    const pr = details.github;

    if (!pr) {
        return null;
    }

    const latestComment = pr.latestComments?.[pr.latestComments.length - 1];

    return (
        <Box
            data-testid="github-detail"
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
            }}
        >
            <InboxDetailHeader
                details={details}
                url={pr.url}
            />

            <Box
                sx={{
                    flex: 1,
                    overflow: "auto",
                    px: { xs: 2, md: 3 },
                    py: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                }}
            >
            <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
            >
                {!!pr.repository && (
                    <Typography variant="body2" color="text.secondary">
                        {pr.repository}
                    </Typography>
                )}
                {!!pr.pullRequestNumber && (
                    <Typography variant="body2" color="text.secondary">
                        #{pr.pullRequestNumber}
                    </Typography>
                )}
                {!!details.reason && (
                    <Chip
                        data-testid="github-detail-reason-chip"
                        data-reason={details.reason}
                        size="small"
                        color={REASON_CHIP_COLOR[details.reason] ?? "default"}
                        label={translateInboxReason(details.reason)}
                    />
                )}
            </Stack>

            <Paper
                variant="outlined"
                sx={{ p: 2, minWidth: 0 }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                >
                    <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center", minWidth: 0 }}
                    >
                        <PersonAvatar person={pr.author} />
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{ fontWeight: 600 }}
                            >
                                opened by{" "}
                                <Box component="span" data-testid="github-detail-author-name">
                                    {pr.author?.displayName ?? pr.author?.login ?? "unknown"}
                                </Box>
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {formatRelativeTime(pr.createdAt)}
                            </Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography
                            data-testid="github-detail-unread-indicator"
                            data-unread={details.isUnread}
                            variant="caption"
                            sx={{
                                color: details.isUnread ? "primary.main" : "text.secondary",
                                fontWeight: details.isUnread ? 600 : 400,
                            }}
                        >
                            {details.isUnread ? "Unread • " : ""}
                            {formatRelativeTime(pr.updatedAt)}
                        </Typography>
                    </Box>
                </Stack>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        columnGap: 4,
                        rowGap: 2,
                        mt: 2.5,
                    }}
                >
                    {!!pr.reviewers?.length && (
                        <Box sx={{ minWidth: 0 }} data-testid="github-detail-reviewers">
                            <Typography
                                variant="overline"
                                color="text.secondary"
                            >
                                Reviewers
                            </Typography>
                            <Stack
                                spacing={0.75}
                                sx={{ mt: 0.5 }}
                            >
                                {pr.reviewers.map((reviewer, index) => (
                                    <Stack
                                        key={reviewer.reviewer?.login ?? index}
                                        data-testid={`github-reviewer-${reviewer.reviewer?.login ?? index}`}
                                        data-review-state={reviewer.reviewState}
                                        direction="row"
                                        spacing={1}
                                        sx={{ alignItems: "center" }}
                                    >
                                        <PersonAvatar
                                            person={reviewer.reviewer}
                                            size={20}
                                        />
                                        <Typography variant="body2" noWrap>
                                            {reviewer.reviewer?.displayName ?? reviewer.reviewer?.login}
                                        </Typography>
                                        <Box
                                            sx={{
                                                width: 6,
                                                height: 6,
                                                flexShrink: 0,
                                                borderRadius: "50%",
                                                bgcolor: REVIEW_STATE_COLOR[reviewer.reviewState ?? ReviewState.Waiting],
                                            }}
                                        />
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {!!pr.linkedWorkItems?.length && (
                        <Box sx={{ minWidth: 0 }} data-testid="github-detail-linked-items">
                            <Typography
                                variant="overline"
                                color="text.secondary"
                            >
                                Linked item
                            </Typography>
                            <Stack
                                spacing={1}
                                sx={{ mt: 0.5 }}
                            >
                                {pr.linkedWorkItems.map((workItem) => (
                                    <Box key={workItem.id}>
                                        <Link
                                            href={workItem.url ?? undefined}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            underline="hover"
                                            sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {workItem.id}
                                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                                        </Link>
                                        {!!workItem.title && (
                                            <Typography
                                                variant="caption"
                                                sx={{ color: "text.secondary", display: "block" }}
                                            >
                                                {workItem.title}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>

                {!!pr.labels?.length && (
                    <Box sx={{ mt: 2.5 }} data-testid="github-detail-labels">
                        <Typography
                            variant="overline"
                            color="text.secondary"
                        >
                            Labels
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.75 }}
                        >
                            {pr.labels.map((label) => (
                                <Chip
                                    key={label}
                                    size="small"
                                    label={label}
                                />
                            ))}
                        </Stack>
                    </Box>
                )}
            </Paper>

            {!!latestComment && (
                <Box sx={{ minWidth: 0 }} data-testid="github-detail-latest-comment">
                    <Typography
                        variant="subtitle2"
                        sx={{ mb: 1 }}
                    >
                        Latest comment
                    </Typography>
                    <Paper
                        variant="outlined"
                        sx={{ p: 2, bgcolor: "action.hover", minWidth: 0 }}
                    >
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center", mb: 1 }}
                        >
                            <PersonAvatar
                                person={latestComment.author}
                                size={24}
                            />
                            <Typography
                                data-testid="github-detail-latest-comment-author"
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                            >
                                {latestComment.author?.displayName ?? latestComment.author?.login}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {formatRelativeTime(latestComment.createdAt)}
                            </Typography>
                        </Stack>

                        <Typography
                            data-testid="github-detail-latest-comment-body"
                            variant="body2"
                            sx={{ mb: 1.5 }}
                        >
                            {latestComment.body}
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: "space-between", alignItems: "center" }}
                        >
                            <Link
                                component="button"
                                type="button"
                                variant="body2"
                                underline="hover"
                            >
                                Reply
                            </Link>
                            {!!pr.url && (
                                <Link
                                    href={pr.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="body2"
                                    underline="hover"
                                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
                                >
                                    View on GitHub
                                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                                </Link>
                            )}
                        </Stack>
                    </Paper>
                </Box>
            )}

            {!!details.privateNote && (
                <Paper
                    data-testid="github-detail-private-note"
                    variant="outlined"
                    sx={{
                        p: 2,
                        bgcolor: (theme) => (theme.palette.mode === "light" ? "#fdf6e8" : "#2a2618"),
                        borderColor: "note.border",
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", mb: 1 }}
                    >
                        <EditNoteIcon
                            fontSize="small"
                            sx={{ color: "note.labelText" }}
                        />
                        <Typography
                            variant="overline"
                            sx={{ color: "note.labelText" }}
                        >
                            Private note
                        </Typography>
                    </Stack>
                    <Typography variant="body2">{details.privateNote}</Typography>
                </Paper>
            )}
            </Box>
        </Box>
    );
};

export default GithubDetail;
