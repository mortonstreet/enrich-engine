import { AuthRequestHandler } from "@/types/handlers";
import { authorizeChannel } from "@/clients/pusher.client";
import { privateUserChannelPrefix, privateOrgChannelPrefix, PusherAuthRequest } from "@shared/types/src";
import { isMemberOfOrganization } from "@/services/organization.service";

export const authChannel: AuthRequestHandler<PusherAuthRequest> = async (
  req,
  res,
) => {
  const { socket_id, channel_name } = req.validated;
  const user = req.user;

  // Handle private-user-{userId} channels
  if (channel_name.startsWith(privateUserChannelPrefix)) {
    const channelUserId = channel_name.replace(privateUserChannelPrefix, "");
    if (channelUserId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const authResponse = authorizeChannel(socket_id, channel_name);
    res.json(authResponse);
    return;
  }

  // Handle private-org-{organizationId} channels
  if (channel_name.startsWith(privateOrgChannelPrefix)) {
    const orgId = channel_name.replace(privateOrgChannelPrefix, "");
    const isMember = await isMemberOfOrganization(user.id, orgId);

    if (!isMember) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const authResponse = authorizeChannel(socket_id, channel_name);
    res.json(authResponse);
    return;
  }

  // Unknown channel type
  res.status(403).json({ error: "Invalid channel" });
};
