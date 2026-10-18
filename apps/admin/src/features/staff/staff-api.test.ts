import { describe, expect, it, vi } from 'vitest';
import { createApiClient, type Transport } from '../../api/client';
import { createStaffAccount, findUser, listStaff, setStaffRole, type StaffUser } from './staff-api';

const user: StaffUser = { id: 'u1', email: 'a@x.co', email_verified: true, staff_role: 'editor' };

function setup(respond: (path: string, init: RequestInit) => Response) {
  const send = vi.fn<Transport>(async (path, init) => respond(path, init));
  return { send, api: createApiClient({ send }) };
}

describe('staff-api', () => {
  it('listStaff: first page has only page_size; the next page sends the token (url-encoded)', async () => {
    const { api, send } = setup(() => Response.json({ items: [user], next_page_token: 'tok/+=' }));
    const page = await listStaff(api);
    expect(page).toEqual({ items: [user], next_page_token: 'tok/+=' });
    expect(send.mock.calls[0][0]).toBe('/v1/admin/staff?page_size=20');

    await listStaff(api, 'tok/+=');
    expect(send.mock.calls[1][0]).toBe('/v1/admin/staff?page_size=20&page_token=tok%2F%2B%3D');
  });

  it('findUser: encodes the email; a 404 not-found resolves to null; other errors throw', async () => {
    const { api, send } = setup(() => Response.json(user));
    await expect(findUser(api, 'a+b@x.co')).resolves.toEqual(user);
    expect(send.mock.calls[0][0]).toBe('/v1/admin/users?email=a%2Bb%40x.co');

    const missing = setup(() => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'nf' }, { status: 404 }));
    await expect(findUser(missing.api, 'no@x.co')).resolves.toBeNull();

    const broken = setup(() => Response.json({ type: 'http://x/problems/forbidden', status: 403, title: 'f' }, { status: 403 }));
    await expect(findUser(broken.api, 'a@x.co')).rejects.toMatchObject({ problem: { slug: 'forbidden' } });
  });

  it('setStaffRole: PUT with staff_role, null removes the role', async () => {
    const { api, send } = setup(() => Response.json({ ...user, staff_role: null }));
    await expect(setStaffRole(api, 'u1', null)).resolves.toMatchObject({ staff_role: null });
    expect(send.mock.calls[0][0]).toBe('/v1/admin/users/u1/staff-role');
    expect(send.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: '{"staff_role":null}' });
  });

  it('createStaffAccount: POST /v1/admin/users with exactly the given body (no password key when generated)', async () => {
    const { api, send } = setup(() => Response.json({ ...user, id: 'u2' }, { status: 201 }));
    await createStaffAccount(api, { email: 'n@x.co', staff_role: 'editor', must_change_password: true, timezone: 'Asia/Ho_Chi_Minh' });
    const [path, init] = send.mock.calls[0];
    expect(path).toBe('/v1/admin/users');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'n@x.co',
      staff_role: 'editor',
      must_change_password: true,
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });
});
