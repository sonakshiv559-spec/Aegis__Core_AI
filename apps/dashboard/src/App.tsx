import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { InvestigationScreen } from '@/features/investigation/InvestigationScreen';
import { DependencyGraphScreen } from '@/features/graph/DependencyGraphScreen';
import { ResponsePlannerScreen } from '@/features/response/ResponsePlannerScreen';
import { AuditScreen } from '@/features/audit/AuditScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<OverviewScreen />} />
                <Route path="/investigation" element={<Navigate to="/investigation/INC-2026-8841" replace />} />
                <Route path="/investigation/:id" element={<InvestigationScreen />} />
                <Route path="/graph" element={<DependencyGraphScreen />} />
                <Route path="/response" element={<ResponsePlannerScreen />} />
                <Route path="/audit" element={<AuditScreen />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
