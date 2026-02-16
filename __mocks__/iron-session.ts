// Mock for iron-session module
export interface IronSession<T = Record<string, any>> {
  [key: string]: any;
  save: () => Promise<void>;
  destroy: () => void;
}

export interface SessionOptions {
  password: string;
  cookieName: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    path?: string;
  };
}

export async function getIronSession<T = Record<string, any>>(
  cookies: any,
  options: SessionOptions
): Promise<IronSession<T>> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
  } as any;
}
