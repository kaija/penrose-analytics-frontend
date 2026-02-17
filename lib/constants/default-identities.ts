// 預設的 Identity 選項，包含大廠常用的識別碼
export const DEFAULT_IDENTITIES = [
  { displayName: 'User UUID', codeName: 'pid' },
  { displayName: 'Account ID', codeName: 'account_id' },
  { displayName: 'Phone Number', codeName: 'phone' },
  { displayName: 'Email', codeName: 'email' },
  { displayName: 'LINE ID', codeName: 'line' },
  { displayName: 'Cookie', codeName: 'cookie' },
  { displayName: 'Device ID', codeName: 'device' },
  { displayName: 'Facebook ID', codeName: 'facebook_id' },
  { displayName: 'Google ID', codeName: 'google_id' },
  { displayName: 'Apple ID', codeName: 'apple_id' },
  { displayName: 'WeChat ID', codeName: 'wechat_id' },
  { displayName: 'Twitter ID', codeName: 'twitter_id' },
  { displayName: 'Instagram ID', codeName: 'instagram_id' },
  { displayName: 'TikTok ID', codeName: 'tiktok_id' },
  { displayName: 'Anonymous ID', codeName: 'anonymous_id' },
  { displayName: 'Session ID', codeName: 'session_id' },
  { displayName: 'IP Address', codeName: 'ip_address' },
  { displayName: 'IDFA', codeName: 'idfa' },
  { displayName: 'GAID', codeName: 'gaid' },
  { displayName: 'IDFV', codeName: 'idfv' },
] as const;

// Code Name 的驗證規則
export const CODE_NAME_REGEX = /^[a-z]+[_a-z0-9]*$/;

export function validateCodeName(codeName: string): boolean {
  return CODE_NAME_REGEX.test(codeName);
}
