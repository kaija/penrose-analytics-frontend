import { NextRequest, NextResponse } from 'next/server';
import type { ProfileReportResponse } from '@/lib/types/profile-report';

const DEMO_DATA: ProfileReportResponse = {
  schemaVersion: 'report.profile.v1',
  summary: { totalProfiles: 48, formattedTotal: '48' },
  table: {
    columns: [
      { id: 'name', label: 'Name', type: 'property', dataType: 'string', sortable: true, currentSort: null },
      { id: 'email', label: 'Email', type: 'property', dataType: 'string', sortable: true, currentSort: null },
      { id: 'company', label: 'Company', type: 'property', dataType: 'string', sortable: true, currentSort: null },
      { id: 'plan', label: 'Plan', type: 'property', dataType: 'string', sortable: true, currentSort: null },
      { id: 'country', label: 'Country', type: 'property', dataType: 'string', sortable: true, currentSort: null },
      { id: 'm1', label: 'Total Logins', type: 'people_metric', dataType: 'number', sortable: true, currentSort: 'desc' },
      { id: 'm2', label: 'Total Pageviews', type: 'people_metric', dataType: 'number', sortable: true, currentSort: null },
      { id: 'm3', label: 'Last Page Viewed', type: 'people_metric', dataType: 'string', sortable: true, currentSort: null },
      { id: 'm4', label: 'Avg Session (min)', type: 'people_metric', dataType: 'number', sortable: true, currentSort: null },
    ],
    rows: [
      { profileId: 'usr_001', avatar: null, values: {
        name: { value: 'Alice Chen', formattedValue: 'Alice Chen' },
        email: { value: 'alice@acme.com', formattedValue: 'alice@acme.com' },
        company: { value: 'Acme Inc', formattedValue: 'Acme Inc' },
        plan: { value: 'enterprise', formattedValue: 'Enterprise' },
        country: { value: 'TW', formattedValue: '🇹🇼 Taiwan' },
        m1: { value: 342, formattedValue: '342' }, m2: { value: 1580, formattedValue: '1,580' },
        m3: { value: 'Dashboard', formattedValue: 'Dashboard' }, m4: { value: 12.5, formattedValue: '12.5' },
      }},
      { profileId: 'usr_002', avatar: null, values: {
        name: { value: 'Bob Wang', formattedValue: 'Bob Wang' },
        email: { value: 'bob@beta.io', formattedValue: 'bob@beta.io' },
        company: { value: 'Beta Ltd', formattedValue: 'Beta Ltd' },
        plan: { value: 'pro', formattedValue: 'Pro' },
        country: { value: 'US', formattedValue: '🇺🇸 United States' },
        m1: { value: 289, formattedValue: '289' }, m2: { value: 1230, formattedValue: '1,230' },
        m3: { value: 'API Reference', formattedValue: 'API Reference' }, m4: { value: 8.3, formattedValue: '8.3' },
      }},
      { profileId: 'usr_003', avatar: null, values: {
        name: { value: 'Carol Liu', formattedValue: 'Carol Liu' },
        email: { value: 'carol@gamma.co', formattedValue: 'carol@gamma.co' },
        company: { value: 'Gamma Co', formattedValue: 'Gamma Co' },
        plan: { value: 'pro', formattedValue: 'Pro' },
        country: { value: 'TW', formattedValue: '🇹🇼 Taiwan' },
        m1: { value: 156, formattedValue: '156' }, m2: { value: 890, formattedValue: '890' },
        m3: { value: 'Settings', formattedValue: 'Settings' }, m4: { value: 6.1, formattedValue: '6.1' },
      }},
      { profileId: 'usr_004', avatar: null, values: {
        name: { value: 'David Kim', formattedValue: 'David Kim' },
        email: { value: 'david@delta.kr', formattedValue: 'david@delta.kr' },
        company: { value: 'Delta Corp', formattedValue: 'Delta Corp' },
        plan: { value: 'enterprise', formattedValue: 'Enterprise' },
        country: { value: 'KR', formattedValue: '🇰🇷 South Korea' },
        m1: { value: 134, formattedValue: '134' }, m2: { value: 720, formattedValue: '720' },
        m3: { value: 'Reports', formattedValue: 'Reports' }, m4: { value: 15.2, formattedValue: '15.2' },
      }},
      { profileId: 'usr_005', avatar: null, values: {
        name: { value: 'Emily Tanaka', formattedValue: 'Emily Tanaka' },
        email: { value: 'emily@epsilon.jp', formattedValue: 'emily@epsilon.jp' },
        company: { value: 'Epsilon Inc', formattedValue: 'Epsilon Inc' },
        plan: { value: 'free', formattedValue: 'Free' },
        country: { value: 'JP', formattedValue: '🇯🇵 Japan' },
        m1: { value: 98, formattedValue: '98' }, m2: { value: 450, formattedValue: '450' },
        m3: { value: 'Getting Started', formattedValue: 'Getting Started' }, m4: { value: 4.7, formattedValue: '4.7' },
      }},
      { profileId: 'usr_006', avatar: null, values: {
        name: { value: 'Frank Zhang', formattedValue: 'Frank Zhang' },
        email: { value: 'frank@zeta.cn', formattedValue: 'frank@zeta.cn' },
        company: { value: 'Zeta Tech', formattedValue: 'Zeta Tech' },
        plan: { value: 'pro', formattedValue: 'Pro' },
        country: { value: 'CN', formattedValue: '🇨🇳 China' },
        m1: { value: 87, formattedValue: '87' }, m2: { value: 380, formattedValue: '380' },
        m3: { value: 'Integrations', formattedValue: 'Integrations' }, m4: { value: 9.8, formattedValue: '9.8' },
      }},
      { profileId: 'usr_007', avatar: null, values: {
        name: { value: 'Grace Park', formattedValue: 'Grace Park' },
        email: { value: 'grace@eta.com', formattedValue: 'grace@eta.com' },
        company: { value: 'Eta Solutions', formattedValue: 'Eta Solutions' },
        plan: { value: 'enterprise', formattedValue: 'Enterprise' },
        country: { value: 'US', formattedValue: '🇺🇸 United States' },
        m1: { value: 76, formattedValue: '76' }, m2: { value: 310, formattedValue: '310' },
        m3: { value: 'Team Members', formattedValue: 'Team Members' }, m4: { value: 11.4, formattedValue: '11.4' },
      }},
      { profileId: 'usr_008', avatar: null, values: {
        name: { value: 'Henry Wu', formattedValue: 'Henry Wu' },
        email: { value: 'henry@theta.sg', formattedValue: 'henry@theta.sg' },
        company: { value: 'Theta Pte', formattedValue: 'Theta Pte' },
        plan: { value: 'pro', formattedValue: 'Pro' },
        country: { value: 'SG', formattedValue: '🇸🇬 Singapore' },
        m1: { value: 65, formattedValue: '65' }, m2: { value: 280, formattedValue: '280' },
        m3: { value: 'Billing', formattedValue: 'Billing' }, m4: { value: 7.2, formattedValue: '7.2' },
      }},
      { profileId: 'usr_009', avatar: null, values: {
        name: { value: 'Iris Müller', formattedValue: 'Iris Müller' },
        email: { value: 'iris@iota.de', formattedValue: 'iris@iota.de' },
        company: { value: 'Iota GmbH', formattedValue: 'Iota GmbH' },
        plan: { value: 'free', formattedValue: 'Free' },
        country: { value: 'DE', formattedValue: '🇩🇪 Germany' },
        m1: { value: 42, formattedValue: '42' }, m2: { value: 190, formattedValue: '190' },
        m3: { value: 'Pricing', formattedValue: 'Pricing' }, m4: { value: 3.5, formattedValue: '3.5' },
      }},
      { profileId: 'usr_010', avatar: null, values: {
        name: { value: 'Jack Lee', formattedValue: 'Jack Lee' },
        email: { value: 'jack@kappa.au', formattedValue: 'jack@kappa.au' },
        company: { value: 'Kappa Pty', formattedValue: 'Kappa Pty' },
        plan: { value: 'pro', formattedValue: 'Pro' },
        country: { value: 'AU', formattedValue: '🇦🇺 Australia' },
        m1: { value: 38, formattedValue: '38' }, m2: { value: 160, formattedValue: '160' },
        m3: { value: 'Dashboard', formattedValue: 'Dashboard' }, m4: { value: 5.9, formattedValue: '5.9' },
      }},
    ],
    pagination: { total: 48, page: 1, pageSize: 10, totalPages: 5 },
  },
};

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Apply search filter on demo data
  let rows = [...DEMO_DATA.table.rows];
  if (body.search) {
    const q = body.search.toLowerCase();
    rows = rows.filter(r =>
      Object.values(r.values).some(v =>
        String(v.formattedValue).toLowerCase().includes(q)
      )
    );
  }

  // Apply sort
  if (body.sort) {
    const { columnId, direction } = body.sort;
    rows.sort((a, b) => {
      const av = a.values[columnId]?.value ?? '';
      const bv = b.values[columnId]?.value ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return direction === 'desc' ? -cmp : cmp;
    });

    // Update currentSort on columns
    DEMO_DATA.table.columns.forEach(c => {
      c.currentSort = c.id === columnId ? direction : null;
    });
  }

  const page = body.pagination?.page ?? 1;
  const pageSize = body.pagination?.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  const paginatedRows = rows.slice(start, start + pageSize);

  const response: ProfileReportResponse = {
    ...DEMO_DATA,
    summary: { totalProfiles: rows.length, formattedTotal: rows.length.toLocaleString() },
    table: {
      ...DEMO_DATA.table,
      rows: paginatedRows,
      pagination: { total: rows.length, page, pageSize, totalPages: Math.ceil(rows.length / pageSize) },
    },
  };

  return NextResponse.json(response);
}
