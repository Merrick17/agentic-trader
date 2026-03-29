'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings2, TrendingUp, ShieldAlert, Filter, Zap, Activity, Shield, ListFilter } from 'lucide-react';
import { toast } from 'sonner';
import type { AgentSettings } from '@/types/settings';
import { DEFAULT_AGENT_SETTINGS, RISK_PRESETS } from '@/types/settings';

interface SettingsPanelProps {
  onSettingsChange?: (settings: AgentSettings) => void;
}

export function AgentSettingsPanel({ onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AgentSettings>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      const data = await res.json();
      setSettings(data.settings);
      onSettingsChange?.(data.settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (preset: 'conservative' | 'moderate' | 'aggressive') => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      });

      if (!res.ok) throw new Error('Failed to apply preset');

      const data = await res.json();
      setSettings(data.settings);
      onSettingsChange?.(data.settings);
      toast.success(`Applied ${preset} preset`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      toast.error('Failed to apply preset');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveSettings(settings);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="general" orientation="vertical" className="w-full h-full flex flex-row gap-6">
      <TabsList className="flex flex-col h-fit justify-start bg-transparent w-48 shrink-0 space-y-2">
        <TabsTrigger value="general" className="w-full justify-start px-4 py-2 font-mono text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all hover:bg-primary/10 rounded-md">
          <Settings2 className="h-4 w-4 mr-2" /> General
        </TabsTrigger>
        <TabsTrigger value="trading" className="w-full justify-start px-4 py-2 font-mono text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all hover:bg-primary/10 rounded-md">
          <Activity className="h-4 w-4 mr-2" /> Trading
        </TabsTrigger>
        <TabsTrigger value="risk" className="w-full justify-start px-4 py-2 font-mono text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all hover:bg-primary/10 rounded-md">
          <Shield className="h-4 w-4 mr-2" /> Risk
        </TabsTrigger>
        <TabsTrigger value="filters" className="w-full justify-start px-4 py-2 font-mono text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all hover:bg-primary/10 rounded-md">
          <ListFilter className="h-4 w-4 mr-2" /> Filters
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-y-auto pr-4 pb-20 space-y-6">
        <TabsContent value="general" className="m-0 space-y-4">
        <Card className="bg-black/40 border-primary/20 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> General Settings
            </CardTitle>
            <CardDescription className="font-mono text-xs">Core agent configuration and behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Trading Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-trading">Autonomous Trading</Label>
                <p className="text-xs text-muted-foreground">
                  Enable automatic trade execution when opportunities are found
                </p>
              </div>
              <Switch
                id="auto-trading"
                checked={settings.autoTradingEnabled}
                onCheckedChange={(v) => updateSetting('autoTradingEnabled', v)}
              />
            </div>

            <Separator />

            {/* Risk Level Preset */}
            <div className="space-y-3">
              <Label>Risk Level Preset</Label>
              <div className="flex gap-2">
                {(['conservative', 'moderate', 'aggressive'] as const).map((preset) => (
                  <Button
                    key={preset}
                    variant={settings.riskLevel === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    disabled={saving}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {settings.riskLevel} - Max ${settings.maxTradeAmountUsd}/trade, {settings.minConfidenceScore}% min confidence
              </p>
            </div>

            <Separator />

            {/* Scan Interval */}
            <div className="space-y-2">
              <Label htmlFor="scan-interval">Scan Interval (seconds)</Label>
              <Input
                id="scan-interval"
                type="number"
                min={10}
                max={300}
                value={settings.scanIntervalMs / 1000}
                onChange={(e) => updateSetting('scanIntervalMs', parseInt(e.target.value) * 1000)}
              />
              <p className="text-xs text-muted-foreground">
                How often the agent scans for new opportunities (10-300 seconds)
              </p>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="space-y-4">
              <Label>Notifications</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-trade" className="text-sm">Trade Executed</Label>
                  <Switch
                    id="notify-trade"
                    checked={settings.notifyOnTrade}
                    onCheckedChange={(v) => updateSetting('notifyOnTrade', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-signal" className="text-sm">New Signal</Label>
                  <Switch
                    id="notify-signal"
                    checked={settings.notifyOnSignal}
                    onCheckedChange={(v) => updateSetting('notifyOnSignal', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-error" className="text-sm">Errors</Label>
                  <Switch
                    id="notify-error"
                    checked={settings.notifyOnError}
                    onCheckedChange={(v) => updateSetting('notifyOnError', v)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trading" className="m-0 space-y-4">
        <Card className="bg-black/40 border-primary/20 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Trading Settings
            </CardTitle>
            <CardDescription className="font-mono text-xs">Position sizing and execution parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Max Trade Amount */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-trade">Max Trade Amount (USD)</Label>
                <span className="text-sm text-muted-foreground">${settings.maxTradeAmountUsd}</span>
              </div>
              <Slider
                id="max-trade"
                min={10}
                max={1000}
                step={10}
                value={[settings.maxTradeAmountUsd]}
                onValueChange={(v) => updateSetting('maxTradeAmountUsd', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Max Concurrent Trades */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-concurrent">Max Concurrent Trades</Label>
                <span className="text-sm text-muted-foreground">{settings.maxConcurrentTrades}</span>
              </div>
              <Slider
                id="max-concurrent"
                min={1}
                max={10}
                step={1}
                value={[settings.maxConcurrentTrades]}
                onValueChange={(v) => updateSetting('maxConcurrentTrades', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Max Daily Trades */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-daily">Max Daily Trades</Label>
                <span className="text-sm text-muted-foreground">{settings.maxDailyTrades}</span>
              </div>
              <Slider
                id="max-daily"
                min={5}
                max={100}
                step={5}
                value={[settings.maxDailyTrades]}
                onValueChange={(v) => updateSetting('maxDailyTrades', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Confidence Thresholds */}
            <div className="space-y-4">
              <Label>Confidence Thresholds</Label>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="min-confidence" className="text-sm">Minimum Confidence (%)</Label>
                  <span className="text-sm text-muted-foreground">{settings.minConfidenceScore}%</span>
                </div>
                <Slider
                  id="min-confidence"
                  min={50}
                  max={95}
                  step={5}
                  value={[settings.minConfidenceScore]}
                  onValueChange={(v) => updateSetting('minConfidenceScore', Array.isArray(v) ? v[0] : v)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="min-confidence-strong" className="text-sm">Strong Buy Confidence (%)</Label>
                  <span className="text-sm text-muted-foreground">{settings.minConfidenceForStrongBuy}%</span>
                </div>
                <Slider
                  id="min-confidence-strong"
                  min={70}
                  max={100}
                  step={5}
                  value={[settings.minConfidenceForStrongBuy]}
                  onValueChange={(v) => updateSetting('minConfidenceForStrongBuy', Array.isArray(v) ? v[0] : v)}
                />
              </div>
            </div>

            <Separator />

            {/* Execution Settings */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="slippage">Slippage Tolerance (bps)</Label>
                <span className="text-sm text-muted-foreground">{settings.slippageBps} bps ({(settings.slippageBps / 100).toFixed(2)}%)</span>
              </div>
              <Slider
                id="slippage"
                min={10}
                max={500}
                step={10}
                value={[settings.slippageBps]}
                onValueChange={(v) => updateSetting('slippageBps', Array.isArray(v) ? v[0] : v)}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="risk" className="m-0 space-y-4">
        <Card className="bg-black/40 border-primary/20 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" /> Risk Management
            </CardTitle>
            <CardDescription className="font-mono text-xs">Stop loss, take profit, and position sizing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stop Loss */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                <span className="text-sm text-destructive">-{settings.stopLossPercent}%</span>
              </div>
              <Slider
                id="stop-loss"
                min={5}
                max={30}
                step={1}
                value={[settings.stopLossPercent]}
                onValueChange={(v) => updateSetting('stopLossPercent', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Take Profit Levels */}
            <div className="space-y-4">
              <Label>Take Profit Levels</Label>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="tp1" className="text-sm">Take Profit 1 (%)</Label>
                  <span className="text-sm text-green-500">+{settings.takeProfit1Percent}%</span>
                </div>
                <Slider
                  id="tp1"
                  min={10}
                  max={200}
                  step={10}
                  value={[settings.takeProfit1Percent]}
                  onValueChange={(v) => updateSetting('takeProfit1Percent', Array.isArray(v) ? v[0] : v)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="tp2" className="text-sm">Take Profit 2 (%)</Label>
                  <span className="text-sm text-green-500">+{settings.takeProfit2Percent}%</span>
                </div>
                <Slider
                  id="tp2"
                  min={20}
                  max={500}
                  step={10}
                  value={[settings.takeProfit2Percent]}
                  onValueChange={(v) => updateSetting('takeProfit2Percent', Array.isArray(v) ? v[0] : v)}
                />
              </div>
            </div>

            <Separator />

            {/* Trailing Stop */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="trailing">Trailing Stop (%)</Label>
                <span className="text-sm text-muted-foreground">{settings.trailingStopPercent}%</span>
              </div>
              <Slider
                id="trailing"
                min={5}
                max={30}
                step={1}
                value={[settings.trailingStopPercent]}
                onValueChange={(v) => updateSetting('trailingStopPercent', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Position Size */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="position-size">Position Size (% of portfolio)</Label>
                <span className="text-sm text-muted-foreground">{settings.positionSizePercent}%</span>
              </div>
              <Slider
                id="position-size"
                min={1}
                max={25}
                step={1}
                value={[settings.positionSizePercent]}
                onValueChange={(v) => updateSetting('positionSizePercent', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Max Price Impact */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="price-impact">Max Price Impact (%)</Label>
                <span className="text-sm text-muted-foreground">{settings.maxPriceImpactPercent}%</span>
              </div>
              <Slider
                id="price-impact"
                min={0.5}
                max={10}
                step={0.5}
                value={[settings.maxPriceImpactPercent]}
                onValueChange={(v) => updateSetting('maxPriceImpactPercent', Array.isArray(v) ? v[0] : v)}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="filters" className="m-0 space-y-4">
        <Card className="bg-black/40 border-primary/20 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Market Filters
            </CardTitle>
            <CardDescription className="font-mono text-xs">Token screening criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Min Liquidity */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="min-liquidity">Min Liquidity (USD)</Label>
                <span className="text-sm text-muted-foreground">${settings.minLiquidityUsd.toLocaleString()}</span>
              </div>
              <Slider
                id="min-liquidity"
                min={1000}
                max={500000}
                step={1000}
                value={[settings.minLiquidityUsd]}
                onValueChange={(v) => updateSetting('minLiquidityUsd', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Min Volume */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="min-volume">Min 24h Volume (USD)</Label>
                <span className="text-sm text-muted-foreground">${settings.minVolume24hUsd.toLocaleString()}</span>
              </div>
              <Slider
                id="min-volume"
                min={1000}
                max={1000000}
                step={1000}
                value={[settings.minVolume24hUsd]}
                onValueChange={(v) => updateSetting('minVolume24hUsd', Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <Separator />

            {/* Enabled Sources */}
            <div className="space-y-3">
              <Label>Data Sources</Label>
              <div className="flex flex-wrap gap-2">
                {['dexscreener', 'birdeye', 'jupiter', 'pumpfun'].map((source) => (
                  <Badge
                    key={source}
                    variant={settings.enabledSources.includes(source) ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => {
                      const sources = settings.enabledSources.includes(source)
                        ? settings.enabledSources.filter((s) => s !== source)
                        : [...settings.enabledSources, source];
                      updateSetting('enabledSources', sources);
                    }}
                  >
                    {source}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Token Lists */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whitelist">Whitelisted Tokens</Label>
                <ScrollArea className="h-20 border rounded p-2">
                  <div className="flex flex-wrap gap-1">
                    {settings.whitelistedTokens.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tokens whitelisted</p>
                    ) : (
                      settings.whitelistedTokens.map((token, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {token}
                          <button
                            className="ml-1 hover:text-destructive"
                            onClick={() => {
                              updateSetting(
                                'whitelistedTokens',
                                settings.whitelistedTokens.filter((_, j) => j !== i)
                              );
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <Input
                  placeholder="Add token (e.g., BONK, WIF)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      updateSetting('whitelistedTokens', [...settings.whitelistedTokens, e.currentTarget.value.trim().toUpperCase()]);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blacklist">Blacklisted Tokens</Label>
                <ScrollArea className="h-20 border rounded p-2">
                  <div className="flex flex-wrap gap-1">
                    {settings.blacklistedTokens.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tokens blacklisted</p>
                    ) : (
                      settings.blacklistedTokens.map((token, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {token}
                          <button
                            className="ml-1 hover:text-white"
                            onClick={() => {
                              updateSetting(
                                'blacklistedTokens',
                                settings.blacklistedTokens.filter((_, j) => j !== i)
                              );
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <Input
                  placeholder="Add token to blacklist"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      updateSetting('blacklistedTokens', [...settings.blacklistedTokens, e.currentTarget.value.trim().toUpperCase()]);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-4 border-t border-primary/20">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
      </div>
    </Tabs>
  );
}
