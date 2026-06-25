import {
  getCheckedClaimIdsForSendBatch,
  validateCheckedClaimsForSendBatch
} from './send-claims-selection.util';

describe('send-claims-selection.util', () => {
  it('scenario 1: checked [622] with RTS grid [620,621,622] submits only 622', () => {
    const gridRtsClaimIds = [620, 621, 622];
    const checked = new Set<number>([622]);

    expect(validateCheckedClaimsForSendBatch(checked)).toBeNull();
    const payloadIds = getCheckedClaimIdsForSendBatch(checked);

    expect(payloadIds).toEqual([622]);
    expect(payloadIds).not.toContain(620);
    expect(payloadIds).not.toContain(621);
    expect(gridRtsClaimIds.filter((id) => !checked.has(id))).toEqual([620, 621]);
  });

  it('scenario 2: checked [620,622] submits only those two claims', () => {
    const checked = new Set<number>([620, 622]);
    const payloadIds = getCheckedClaimIdsForSendBatch(checked).sort((a, b) => a - b);

    expect(payloadIds).toEqual([620, 622]);
    expect(payloadIds).not.toContain(621);
  });

  it('scenario 3: no claims checked blocks submission', () => {
    const checked = new Set<number>();

    expect(validateCheckedClaimsForSendBatch(checked)).toBe('Please select at least one claim.');
    expect(getCheckedClaimIdsForSendBatch(checked)).toEqual([]);
  });
});
