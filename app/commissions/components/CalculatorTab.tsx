import React, { useEffect, useState } from 'react'
import { fmt$ } from '@/lib/utils'
import { calculateCommission } from '@/lib/api'
import { Calculator } from 'lucide-react'
import { ROLE_LABELS } from './types'
import type { CommissionRate } from '@/types/database'

// ── Calculator Tab ───────────────────────────────────────────────────────────

export function CalculatorTab({ rates }: { rates: CommissionRate[] }) {
  const [systemKw, setSystemKw] = useState('')
  const [adderRevenue, setAdderRevenue] = useState('')
  const [referralCount, setReferralCount] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [isEC, setIsEC] = useState(false)
  const [result, setResult] = useState<{
    solar: number; adder: number; referral: number; total: number;
    solarRate: number; adderRate: number; referralRate: number; watts: number;
    grossRate: number; opsDeduction: number; ecBonus: number; effectiveRate: number
  } | null>(null)

  const activeRates = rates.filter(r => r.active)
  const roleKeys = Array.from(new Set(activeRates.map(r => r.role_key)))

  useEffect(() => {
    if (roleKeys.length > 0 && !selectedRole) {
      setSelectedRole(roleKeys[0])
    }
  }, [roleKeys.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const calculate = () => {
    const watts = parseFloat(systemKw || '0') * 1000
    const adders = parseFloat(adderRevenue || '0')
    const referrals = parseInt(referralCount || '0', 10)

    // EC/Non-EC rate breakdown (from CSV: EC $0.50/W, Non-EC $0.35/W)
    const grossRate = isEC ? 0.50 : 0.35
    const opsDeduction = 0.10 // ops deduction $/W
    const effectiveRate = grossRate - opsDeduction // $0.40 (EC) or $0.25 (non-EC)
    const ecBonus = isEC ? 0.15 : 0 // EC bonus over non-EC (display only)

    const breakdown = calculateCommission(watts, adders, referrals, selectedRole, rates)

    const roleRate = activeRates.find(r => r.role_key === selectedRole)
    const adderRate = activeRates.find(r => r.role_key === 'adder' && r.active)
    const referralRate = activeRates.find(r => r.role_key === 'referral' && r.active)

    setResult({
      solar: breakdown.solarCommission,
      adder: breakdown.adderCommission,
      referral: breakdown.referralCommission,
      total: breakdown.total,
      solarRate: roleRate?.rate ?? 0,
      adderRate: adderRate?.rate ?? 0,
      referralRate: referralRate?.rate ?? 0,
      watts,
      grossRate,
      opsDeduction,
      ecBonus,
      effectiveRate,
    })
  }

  return (
    <div className="space-y-6">
      {/* Calculator Form */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-green-400" />
          Quick Calculator
        </h3>
        {/* EC Toggle */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={isEC}
              onClick={() => setIsEC(!isEC)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isEC ? 'bg-green-600' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isEC ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs text-gray-300 font-medium">Energy Community</span>
          </label>
          {isEC && (
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/40 text-green-400 border border-green-800">
              EC
            </span>
          )}
          <span className="text-[10px] text-gray-500">
            {isEC ? '$0.40/W effective ($0.50 gross - $0.10 ops + $0.15 EC bonus)' : '$0.25/W effective ($0.35 gross - $0.10 ops)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">System Size (kW)</label>
            <input
              type="number"
              step="0.1"
              value={systemKw}
              onChange={e => setSystemKw(e.target.value)}
              placeholder="e.g. 10.5"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
            {systemKw && <p className="text-[10px] text-gray-500 mt-1">{(parseFloat(systemKw || '0') * 1000).toLocaleString()} watts</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Adder Revenue ($)</label>
            <input
              type="number"
              step="0.01"
              value={adderRevenue}
              onChange={e => setAdderRevenue(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Referral Count</label>
            <input
              type="number"
              step="1"
              value={referralCount}
              onChange={e => setReferralCount(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              {roleKeys.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={calculate}
          className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          Calculate
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Commission Breakdown</h3>
          <div className="space-y-3">
            {/* EC Rate Breakdown */}
            <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 mb-2">
              <p className="text-[10px] text-gray-500 font-medium mb-2 uppercase tracking-wider">Rate Breakdown</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">${result.grossRate.toFixed(2)} gross</span>
                <span className="text-red-400">- ${result.opsDeduction.toFixed(2)} ops</span>
                {result.ecBonus > 0 && (
                  <span className="text-green-400">+ ${result.ecBonus.toFixed(2)} EC bonus</span>
                )}
                <span className="text-gray-600">=</span>
                <span className="text-white font-medium">${result.effectiveRate.toFixed(2)}/W effective</span>
                {result.ecBonus > 0 && (
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-900/40 text-green-400 border border-green-800 ml-1">EC</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
              <div>
                <p className="text-sm text-gray-300">Solar Commission</p>
                <p className="text-xs text-gray-500">{result.watts.toLocaleString()} watts x ${result.solarRate}/watt</p>
              </div>
              <p className="text-sm font-medium text-white">{fmt$(result.solar)}</p>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
              <div>
                <p className="text-sm text-gray-300">Adder Commission</p>
                <p className="text-xs text-gray-500">{fmt$(parseFloat(adderRevenue || '0'))} x {result.adderRate}%</p>
              </div>
              <p className="text-sm font-medium text-white">{fmt$(result.adder)}</p>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
              <div>
                <p className="text-sm text-gray-300">Referral Bonus</p>
                <p className="text-xs text-gray-500">{referralCount || '0'} x {fmt$(result.referralRate)}</p>
              </div>
              <p className="text-sm font-medium text-white">{fmt$(result.referral)}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-b border-gray-700/50 pb-3">
              <p className="text-base font-semibold text-white">Total Commission</p>
              <p className="text-xl font-bold text-green-400">{fmt$(result.total)}</p>
            </div>

            {/* Leadership Override Waterfall */}
            <div className="mt-4">
              <p className="text-[10px] text-gray-500 font-medium mb-2 uppercase tracking-wider">Leadership Override (Example)</p>
              <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Team Stack Rate</span>
                  <span className="text-white">$0.40/W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rep Pay Scale (example)</span>
                  <span className="text-amber-400">-$0.25/W</span>
                </div>
                <div className="flex justify-between border-t border-gray-700/50 pt-2">
                  <span className="text-gray-300 font-medium">Override Per Watt</span>
                  <span className="text-white font-medium">$0.15/W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Override Pool ({result.watts.toLocaleString()} W)</span>
                  <span className="text-green-400 font-medium">{fmt$(result.watts * 0.15)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Distribution Split</p>
                  {[
                    { role: 'EC', pct: 40 }, { role: 'EA', pct: 40 }, { role: 'Incentive', pct: 2 },
                    { role: 'PM', pct: 3 }, { role: 'Asst Mgr', pct: 3 }, { role: 'VP', pct: 3 }, { role: 'Regional', pct: 9 },
                  ].map(d => (
                    <div key={d.role} className="flex justify-between">
                      <span className="text-gray-400">{d.role} ({d.pct}%)</span>
                      <span className="text-gray-300">{fmt$(result.watts * 0.15 * d.pct / 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Current Rate Card</h3>
        <div className="overflow-auto rounded-lg border border-gray-700">
          <table className="w-full text-xs">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Role</th>
                <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Type</th>
                <th className="text-right px-3 py-2.5 text-gray-400 font-medium">Rate</th>
                <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {activeRates.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-700/20">
                  <td className="px-3 py-2 text-white font-medium">{ROLE_LABELS[r.role_key] ?? r.role_key}</td>
                  <td className="px-3 py-2 text-gray-400">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                      r.rate_type === 'per_watt' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                      r.rate_type === 'percentage' ? 'bg-amber-900/40 text-amber-400 border border-amber-800' :
                      'bg-green-900/40 text-green-400 border border-green-800'
                    }`}>
                      {r.rate_type === 'per_watt' ? 'Per Watt' : r.rate_type === 'percentage' ? 'Percentage' : 'Flat Fee'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-white font-mono">
                    {r.rate_type === 'per_watt' ? `$${r.rate}/W` :
                     r.rate_type === 'percentage' ? `${r.rate}%` :
                     fmt$(r.rate)}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.description || '\u2014'}</td>
                </tr>
              ))}
              {activeRates.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-600 text-sm">No active rates configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
