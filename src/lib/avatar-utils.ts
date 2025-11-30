import { identicon } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";

/**
 * Generate a DiceBear identicon avatar as a data URI
 * @param identifier - Unique identifier (user ID) for consistent avatar generation
 * @returns Data URI string that can be used in img src
 */
export function generateDiceBearAvatar(identifier: string): string {
  const avatar = createAvatar(identicon, {
    seed: identifier,
    size: 128,
  });

  const svg = avatar.toString();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Get the appropriate avatar URL for a user
 * Returns custom avatar if available, otherwise generates a DiceBear identicon
 * @param user - User object with id and optional image
 * @returns Avatar URL to display
 */
export function getAvatarUrl(user: {
  id: string;
  image?: string | null;
}): string {
  if (user.image) {
    return user.image;
  }
  return generateDiceBearAvatar(user.id);
}
