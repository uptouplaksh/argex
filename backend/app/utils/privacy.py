PRIVILEGED_BID_VIEW_ROLES = {"admin", "defender"}


def normalize_role(role) -> str:
    value = getattr(role, "value", role)
    return str(value or "").strip().lower()


def can_view_full_bidder_username(user) -> bool:
    return normalize_role(getattr(user, "role", None)) in PRIVILEGED_BID_VIEW_ROLES


def mask_username(username: str | None) -> str | None:
    if not username:
        return username

    value = str(username)
    length = len(value)

    if length <= 2:
        return value[0] + "*" * max(length - 1, 0)

    if length <= 4:
        return f"{value[0]}{'*' * (length - 2)}{value[-1]}"

    prefix_length = 2
    suffix_length = 2 if length >= 8 else 1
    masked_length = max(length - prefix_length - suffix_length, 1)
    return f"{value[:prefix_length]}{'*' * masked_length}{value[-suffix_length:]}"


def public_bidder_username(username: str | None, viewer=None) -> str | None:
    if can_view_full_bidder_username(viewer):
        return username
    return mask_username(username)
