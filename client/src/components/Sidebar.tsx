import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Briefcase, 
  BarChart3, 
  Search, 
  Settings,
  ChevronRight,
  Star,
  FileText,
  Calendar,
  Database
} from "lucide-react";

const navigation = [
  { name: "Analysis Hub", href: "/", icon: Search, description: "Analyze candidates vs jobs" },
  { name: "Candidates", href: "/candidates", icon: Users, description: "Manage candidate database" },
  { name: "Job Templates", href: "/job-templates", icon: Briefcase, description: "Store job descriptions" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, description: "Analysis history & insights" },
];

export function Sidebar() {
  const [location] = useLocation();

  // Fetch real data for quick actions
  const { data: candidatesData } = useQuery({
    queryKey: ['/api/candidates', { page: 1, pageSize: 1000 }],
    queryFn: async () => {
      const res = await fetch('/api/candidates?page=1&pageSize=1000', { credentials: 'include' });
      if (!res.ok) return { candidates: [], total: 0 };
      return res.json();
    }
  });

  const { data: analysesData } = useQuery({
    queryKey: ['/api/analyses'],
    queryFn: async () => {
      const res = await fetch('/api/analyses', { credentials: 'include' });
      if (!res.ok) return { analyses: [], total: 0 };
      return res.json();
    }
  });

  const { data: interviewsData } = useQuery({
    queryKey: ['/api/interviews'],
    queryFn: async () => {
      const res = await fetch('/api/interviews', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const favorites = candidatesData?.candidates?.filter(c => c.isFavorite)?.length || 0;
  const recentAnalyses = analysesData?.total || 0;
  const upcomingInterviews = interviewsData?.filter(i => i.status === 'scheduled')?.length || 0;

  const quickActions = [
    { name: "Favorites", icon: Star, count: favorites, href: "/candidates?filter=favorites" },
    { name: "Recent", icon: FileText, count: recentAnalyses, href: "/analytics" },
    { name: "Interviews", icon: Calendar, count: upcomingInterviews, href: "/interviews" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <Database className="h-8 w-8 text-primary mr-3" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">TalentScope</h1>
            <p className="text-xs text-gray-500">ApexAxiom</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Main Navigation
          </h2>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-primary-foreground" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-primary-foreground/80" : "text-gray-500"
                    )}>
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Access
          </h2>
          {quickActions.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className="group flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
                <div className="flex items-center">
                  <item.icon className="mr-3 flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  <span>{item.name}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {item.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      {/* Settings */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors">
          <Settings className="mr-3 h-4 w-4 text-gray-400" />
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
}