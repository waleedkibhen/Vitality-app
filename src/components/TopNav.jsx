import { useAuth } from '../context/AuthContext'

export default function TopNav() {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0a0a] border-b border-[#222]">
      <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center justify-between">
        
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#2563EB] flex items-center justify-center">
            <span className="text-white text-xs font-bold font-mono">V</span>
          </div>
          <span className="text-[#f1f1f1] font-semibold tracking-tight text-sm">
            VIRALITY
          </span>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#333] border-t-[#fff] rounded-full animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2.5">
              <span className="text-[#a1a1aa] text-xs font-medium tracking-wide">
                @{user.username}
              </span>
              {user.profilePicUrl ? (
                <img 
                  src={user.profilePicUrl} 
                  alt={user.username} 
                  className="w-8 h-8 rounded-full object-cover border border-[#333]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                  <span className="text-[#666] text-xs uppercase font-bold">
                    {user.username.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </div>
    </header>
  )
}
