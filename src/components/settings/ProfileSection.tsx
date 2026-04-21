import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Check, User } from 'lucide-react';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  email_notifications: boolean;
  marketing_emails: boolean;
}

const ProfileSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, avatar_url, email_notifications, marketing_emails').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
      }
    });
  }, [user]);

  const saveDisplayName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, display_name: displayName.trim() || null }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated ✨' });
      setProfile(p => p ? { ...p, display_name: displayName } : p);
    }
  };

  const toggleNotification = async (field: 'email_notifications' | 'marketing_emails', value: boolean) => {
    if (!user || !profile) return;
    setProfile({ ...profile, [field]: value });
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, [field]: value }, { onConflict: 'user_id' });
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      setProfile({ ...profile, [field]: !value });
    }
  };

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Max 2 MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('profiles').upsert({ user_id: user.id, avatar_url: publicUrl }, { onConflict: 'user_id' });
      if (dbErr) throw dbErr;
      setProfile(p => p ? { ...p, avatar_url: publicUrl } : p);
      toast({ title: 'Avatar updated 📸' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    }
    setUploading(false);
  };

  const initial = (displayName || user?.email || 'U').charAt(0).toUpperCase();
  const dirty = profile && displayName.trim() !== (profile.display_name || '');

  return (
    <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
      {/* Avatar + name */}
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative w-14 h-14 rounded-full gradient-primary flex items-center justify-center shrink-0 text-xl font-bold text-primary-foreground shadow-md shadow-primary/20 overflow-hidden group"
          aria-label="Change avatar"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="h-9 text-sm pl-8 pr-16 bg-secondary/30 border-border/30"
              maxLength={40}
            />
            {dirty && (
              <Button size="sm" onClick={saveDisplayName} disabled={saving} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 gradient-primary border-0 text-[11px]">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Save</>}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Notification toggles */}
      {profile && (
        <>
          <Toggle
            label="Email notifications"
            desc="Daily love note reminders & weekly summaries"
            checked={profile.email_notifications}
            onChange={v => toggleNotification('email_notifications', v)}
          />
          <Toggle
            label="Marketing emails"
            desc="Product updates and special offers"
            checked={profile.marketing_emails}
            onChange={v => toggleNotification('marketing_emails', v)}
          />
        </>
      )}
    </div>
  );
};

const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="w-full p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/20 transition-colors">
    <div className="flex-1 min-w-0">
      <p className="text-sm">{label}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-secondary'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  </label>
);

export default ProfileSection;