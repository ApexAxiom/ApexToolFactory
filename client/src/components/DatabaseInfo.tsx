import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Clock, Star } from "lucide-react";

interface DatabaseInfoProps {
  totalCandidates: number;
  favorites: number;
}

export function DatabaseInfo({ totalCandidates, favorites }: DatabaseInfoProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-blue-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Database Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{totalCandidates.toLocaleString()}</div>
            <div className="text-sm text-blue-700">Total Candidates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{favorites.toLocaleString()}</div>
            <div className="text-sm text-blue-700">Favorites</div>
          </div>
        </div>
        
        <div className="border-t border-blue-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Database Type</span>
            <Badge variant="secondary">PostgreSQL</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Storage Limit</span>
            <Badge variant="secondary">Millions of records</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Upload Limit</span>
            <Badge variant="secondary">50 files per batch</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Search Features</span>
            <div className="flex gap-1">
              <Search className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600">Full-text</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Data Retention</span>
            <div className="flex gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-600">1yr</span>
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-yellow-600">3yr favorites</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Auto-Save:</strong> Every uploaded resume becomes a searchable candidate profile. 
            Switch to your own database anytime - the design is enterprise-ready.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}