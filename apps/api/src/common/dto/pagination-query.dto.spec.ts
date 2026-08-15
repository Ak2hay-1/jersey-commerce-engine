import { toPaginationArgs, toPaginationMeta } from './pagination-query.dto';

describe('pagination helpers', () => {
  it('computes skip/take from page and pageSize', () => {
    expect(toPaginationArgs({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it('uses limit as an alias of pageSize', () => {
    expect(toPaginationArgs({ page: 2, limit: 5 })).toEqual({
      page: 2,
      pageSize: 5,
      skip: 5,
      take: 5,
    });
  });

  it('returns at least one page in metadata', () => {
    expect(toPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      pageSize: 20,
      limit: 20,
      totalItems: 0,
      total: 0,
      totalPages: 1,
    });
  });
});
