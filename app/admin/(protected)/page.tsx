import { AdminDualImageDesk } from '@/src/components/admin/AdminDualImageDesk';
import { listAssets } from '@/src/server/admin/assets-service';
import { getSiteSettings } from '@/src/server/admin/settings-service';

export default function AdminHomePage() {
  const aiAssets = listAssets({ kind: 'ai' });
  const realAssets = listAssets({ kind: 'real' });
  const settings = getSiteSettings();

  return <AdminDualImageDesk aiAssets={aiAssets} realAssets={realAssets} settings={settings} />;
}
