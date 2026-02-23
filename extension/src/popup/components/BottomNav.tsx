import { Search, Users, Database, Settings, ShoppingCart } from 'lucide-react'

export type NavTab = 'enrich' | 'cart' | 'leads' | 'vendors' | 'settings'

interface BottomNavProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  cartCount?: number
}

export function BottomNav({ activeTab, onTabChange, cartCount = 0 }: BottomNavProps) {
  const tabs: { id: NavTab; label: string; icon: typeof Search }[] = [
    { id: 'enrich', label: 'Enrich', icon: Search },
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'vendors', label: 'Vendors', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`bottom-nav-tab ${activeTab === id ? 'active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
          {id === 'cart' && cartCount > 0 && (
            <span className="bottom-nav-badge">{cartCount > 99 ? '99+' : cartCount}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
