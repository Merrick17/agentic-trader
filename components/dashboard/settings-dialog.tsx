'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Bot, Key, Paintbrush, Monitor, Moon, Sun, Eye, EyeOff, Save } from 'lucide-react';
import { AgentSettingsPanel } from './agent-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger ? (
          <div className="cursor-pointer">{trigger}</div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary/70 hover:text-primary hover:bg-primary/10"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[850px] h-[85vh] overflow-hidden flex flex-col p-0 border-primary/30 bg-black/95 backdrop-blur-xl shadow-[0_0_40px_-15px_rgba(0,255,65,0.3)]">
        <Tabs defaultValue="agent" className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 border-b border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
            <DialogHeader>
              <DialogTitle className="font-mono text-xl text-primary flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                Platform Intelligence Center
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-muted-foreground mt-2">
                Configure autonomous trading parameters, integrate external data sources, and customize your command interface.
              </DialogDescription>
            </DialogHeader>

            <TabsList variant="line" className="w-full justify-start mt-6 -mb-6 border-b border-primary/10">
              <TabsTrigger value="agent" className="font-mono text-sm px-6 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary transition-all">
                <Bot className="mr-2 h-4 w-4" /> Agent
              </TabsTrigger>
              <TabsTrigger value="keys" className="font-mono text-sm px-6 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary transition-all">
                <Key className="mr-2 h-4 w-4" /> API Integrations
              </TabsTrigger>
              <TabsTrigger value="appearance" className="font-mono text-sm px-6 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary transition-all">
                <Paintbrush className="mr-2 h-4 w-4" /> Appearance
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-black/40">
            <TabsContent value="agent" className="m-0 h-full focus-visible:outline-none py-6 px-2">
              <AgentSettingsPanel />
            </TabsContent>
            
            <TabsContent value="keys" className="m-0 focus-visible:outline-none p-6">
              <div className="max-w-2xl mx-auto space-y-8 pb-10">
                <div>
                  <h3 className="text-lg font-medium font-mono text-primary mb-1">External API Keys</h3>
                  <p className="text-sm text-muted-foreground font-mono mb-6">Connect external services to enhance the agent's data resolution and execution capabilities.</p>
                </div>

                <div className="space-y-6">
                  {/* Birdeye API */}
                  <div className="space-y-3 p-5 border border-primary/20 rounded-lg bg-black/50 hover:border-primary/40 transition-colors">
                    <Label className="font-mono text-primary flex justify-between items-center">
                      Birdeye API Key
                      <span className="text-xs text-muted-foreground">Required for token stats</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type={showKeys['birdeye'] ? 'text' : 'password'} 
                          placeholder="Enter your Birdeye API key..." 
                          className="font-mono bg-black/80 border-primary/30 pr-10"
                          defaultValue="••••••••••••••••••••••••••••••••"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => toggleKeyVisibility('birdeye')}
                        >
                          {showKeys['birdeye'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/20">Verify</Button>
                    </div>
                  </div>

                  {/* Jupiter API */}
                  <div className="space-y-3 p-5 border border-primary/20 rounded-lg bg-black/50 hover:border-primary/40 transition-colors">
                    <Label className="font-mono text-primary flex justify-between items-center">
                      Jupiter Station API Key
                      <span className="text-xs text-muted-foreground">Optional (reduces rate limits on swaps)</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type={showKeys['jupiter'] ? 'text' : 'password'} 
                          placeholder="Optional: Enter Jupiter API key..." 
                          className="font-mono bg-black/80 border-primary/30 pr-10"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => toggleKeyVisibility('jupiter')}
                        >
                          {showKeys['jupiter'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/20">Verify</Button>
                    </div>
                  </div>

                  {/* Groq API */}
                  <div className="space-y-3 p-5 border border-primary/20 rounded-lg bg-black/50 hover:border-primary/40 transition-colors">
                    <Label className="font-mono text-primary flex justify-between items-center">
                      Groq API Key
                      <span className="text-xs text-muted-foreground">Required for LLM inference</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type={showKeys['groq'] ? 'text' : 'password'} 
                          placeholder="Enter Groq API key..." 
                          className="font-mono bg-black/80 border-primary/30 pr-10"
                          defaultValue="gsk_••••••••••••••••••••••••••••••••"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => toggleKeyVisibility('groq')}
                        >
                          {showKeys['groq'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/20">Verify</Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <Button className="font-mono bg-primary text-black hover:bg-primary/90">
                    <Save className="h-4 w-4 mr-2" /> Save Integrations
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="appearance" className="m-0 focus-visible:outline-none p-6">
              <div className="max-w-2xl mx-auto space-y-8 pb-10">
                <div>
                  <h3 className="text-lg font-medium font-mono text-primary mb-1">Terminal Appearance</h3>
                  <p className="text-sm text-muted-foreground font-mono mb-6">Customize the look and feel of your command center.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-primary rounded-lg bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                    <Moon className="h-8 w-8 text-primary mb-3" />
                    <span className="font-mono text-sm font-medium">Dark Mode (Matrix)</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 border border-primary/20 rounded-lg bg-black/50 cursor-pointer hover:bg-primary/5 transition-colors opacity-50">
                    <Sun className="h-8 w-8 text-muted-foreground mb-3" />
                    <span className="font-mono text-sm text-muted-foreground">Light Mode</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 border border-primary/20 rounded-lg bg-black/50 cursor-pointer hover:bg-primary/5 transition-colors opacity-50">
                    <Monitor className="h-8 w-8 text-muted-foreground mb-3" />
                    <span className="font-mono text-sm text-muted-foreground">System Sync</span>
                  </div>
                </div>

                <div className="space-y-4 pt-6 mt-6 border-t border-primary/20">
                  <h4 className="font-mono text-sm text-primary uppercase tracking-widest">UI Elements</h4>
                  
                  <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg bg-black/50 hover:bg-black/80 transition-colors">
                    <div className="space-y-1">
                      <Label className="font-mono text-primary cursor-pointer" htmlFor="crt-scanline">CRT Scanline Effect</Label>
                      <p className="text-xs text-muted-foreground font-mono">Enable retro terminal scanlines over the interface</p>
                    </div>
                    <Switch id="crt-scanline" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg bg-black/50 hover:bg-black/80 transition-colors">
                    <div className="space-y-1">
                      <Label className="font-mono text-primary cursor-pointer" htmlFor="reduced-motion">Reduced Motion</Label>
                      <p className="text-xs text-muted-foreground font-mono">Disable pulse effects and interface animations</p>
                    </div>
                    <Switch id="reduced-motion" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
