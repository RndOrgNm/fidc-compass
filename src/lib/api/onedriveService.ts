import { FUNDS_API_BASE_URL } from "./config";

export interface OnedriveStatusResponse {
  /** ISO time of the connector's last check of the OneDrive; null when unknown. */
  last_synced_at: string | null;
}

export async function getOnedriveStatus(): Promise<OnedriveStatusResponse> {
  const response = await fetch(`${FUNDS_API_BASE_URL}/onedrive/status`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
