import { useState, useEffect, useTransition, useCallback } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useReminderNotifications } from '@/hooks/useNotifications';
import { applyTheme } from '@/lib/themes';
import { TabId, AppSettings, Income, Expense, Meeting } from '@/types';
import { BottomNav } from '@/components/BottomNav';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardPage } from './DashboardPage';
import { IncomePage } from './IncomePage';
import { ExpensesPage } from './ExpensesPage';
import { MeetingsPage } from './MeetingsPage';
import { SummaryPage } from './SummaryPage';
import { SettingsPage } from './SettingsPage';
import { TasksPage } from './TasksPage';
import { HabitsPage } from './HabitsPage';
import { RemindersPage } from './RemindersPage';
import { IdeasPage } from './IdeasPage';
import { DreamBucketPage } from './DreamBucketPage';
import { VehiclesPage } from './VehiclesPage';
import { GroomingPage } from './GroomingPage';
import { ReportsPage } from './ReportsPage';
import { BudgetsPage } from './BudgetsPage';
import { SubscriptionsPage } from './SubscriptionsPage';
import { CalendarPage } from './CalendarPage';
import { LentBorrowPage } from './LentBorrowPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PullToRefresh } from '@/components/PullToRefresh';
import { DashboardSkeleton, PageSkeleton } from '@/components/Skeletons';
import { AppLockGate } from '@/components/AppLockGate';
import { Onboarding, onboardingSeen } from '@/components/Onboarding';



interface ReportsWithSummaryProps {
  incomes: Income[];
  expenses: Expense[];
  currency: string;
  getMonthlyStats: (year: number, month: number) => { totalIncome: number; totalExpenses: number; balance: number };
}

/** Reports page with the Monthly summary folded in as a second tab. */
function ReportsWithSummary({ incomes, expenses, currency, getMonthlyStats }: ReportsWithSummaryProps) {
  return (
    <Tabs defaultValue="reports" className="w-full">
      <div className="px-4 md:px-0 pt-2 pb-1">
        <TabsList className="w-full glass">
          <TabsTrigger value="reports" className="flex-1">Reports</TabsTrigger>
          <TabsTrigger value="summary" className="flex-1">Monthly summary</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="reports" className="mt-0">
        <ReportsPage incomes={incomes} expenses={expenses} currency={currency} getMonthlyStats={getMonthlyStats} />
      </TabsContent>
      <TabsContent value="summary" className="mt-0">
        <SummaryPage incomes={incomes} expenses={expenses} currency={currency} getMonthlyStats={getMonthlyStats} />
      </TabsContent>
    </Tabs>
  );
}


const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !onboardingSeen());
  const [isPending, startTransition] = useTransition();

  const {
    incomes, expenses, meetings, savingsGoals, tasks, taskLists, habits, habitLogs, reminders,
    ideas, moodEntries, dreamBucket, vehicles, vehicleServices, vehicleExpenses, groomingEntries,
    budgets, subscriptions, subtasks, lentBorrowEntries, bankAccounts,
    addLentBorrow, updateLentBorrow, deleteLentBorrow,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addIncome, updateIncome, deleteIncome,
    addExpense, updateExpense, deleteExpense,
    addMeeting, updateMeeting, deleteMeeting,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addTask, updateTask, deleteTask,
    addSubtask, updateSubtask, deleteSubtask,
    addTaskList, updateTaskList, deleteTaskList,
    addBudget, updateBudget, deleteBudget,
    addSubscription, updateSubscription, deleteSubscription,
    addHabit, deleteHabit, toggleHabitLog,
    addReminder, updateReminder, deleteReminder,
    addIdea, deleteIdea,
    addMoodEntry, deleteMoodEntry,
    addDreamItem, updateDreamItem, deleteDreamItem,
    addVehicle, updateVehicle, deleteVehicle,
    addVehicleService, updateVehicleService, deleteVehicleService,
    addVehicleExpense, deleteVehicleExpense,
    addGroomingEntry, deleteGroomingEntry,
    updateSettings, getMonthlyStats, getAllTimeBalance, upcomingMeetings,
    resetFinances,
    settings, refreshData, loading,
  } = useAppData();

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    applyTheme(settings.theme || 'purple');
  }, [settings.theme]);

  // In-app + native notifications for reminders & vehicle services
  useReminderNotifications(reminders, vehicleServices, vehicles);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };


  // Non-blocking tab switch: keeps current screen interactive while the next renders
  const handleTabChange = useCallback((tab: TabId) => {
    startTransition(() => setActiveTab(tab));
  }, []);

  const renderPage = () => {
    if (loading) {
      return activeTab === 'dashboard' ? <DashboardSkeleton /> : <PageSkeleton />;
    }
    switch (activeTab) {
      case 'dashboard':

        return <DashboardPage incomes={incomes} expenses={expenses} budgets={budgets} subscriptions={subscriptions}
          upcomingMeetings={upcomingMeetings} meetings={meetings} tasks={tasks} ideas={ideas} reminders={reminders}
          currency={settings.currency}
          getMonthlyStats={getMonthlyStats} getAllTimeBalance={getAllTimeBalance}
          onNavigate={handleTabChange} onResetBalance={resetFinances} />;

      case 'income':
        return <IncomePage incomes={incomes} bankAccounts={bankAccounts} currency={settings.currency} onAdd={addIncome} onUpdate={updateIncome} onDelete={deleteIncome} onAddAccount={addBankAccount} onUpdateAccount={updateBankAccount} onDeleteAccount={deleteBankAccount} />;
      case 'expenses':
        return <ExpensesPage expenses={expenses} currency={settings.currency} onAdd={addExpense} onUpdate={updateExpense} onDelete={deleteExpense} />;
      case 'lentborrow':
        return <LentBorrowPage entries={lentBorrowEntries} currency={settings.currency} onAdd={addLentBorrow} onUpdate={updateLentBorrow} onDelete={deleteLentBorrow} />;
      case 'meetings':
        return <MeetingsPage meetings={meetings} upcomingMeetings={upcomingMeetings} onAdd={addMeeting} onUpdate={updateMeeting} onDelete={deleteMeeting} />;
      case 'tasks':
        return <TasksPage tasks={tasks} taskLists={taskLists} meetings={meetings}
          subtasks={subtasks}
          onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask}
          onAddSubtask={addSubtask} onUpdateSubtask={updateSubtask} onDeleteSubtask={deleteSubtask}
          onAddList={addTaskList} onUpdateList={updateTaskList} onDeleteList={deleteTaskList} />;
      case 'budgets':
        return <BudgetsPage budgets={budgets} expenses={expenses} currency={settings.currency}
          onAdd={addBudget} onUpdate={updateBudget} onDelete={deleteBudget} />;
      case 'subscriptions':
        return <SubscriptionsPage subscriptions={subscriptions} currency={settings.currency}
          onAdd={addSubscription} onUpdate={updateSubscription} onDelete={deleteSubscription} />;
      case 'calendar':
        return <CalendarPage meetings={meetings} tasks={tasks} reminders={reminders} />;
      case 'habits':
        return <HabitsPage habits={habits} habitLogs={habitLogs} onAdd={addHabit} onDelete={deleteHabit} onToggleLog={toggleHabitLog} />;
      case 'reminders':
        return <RemindersPage reminders={reminders} vehicleServices={vehicleServices} vehicles={vehicles}
          onAdd={addReminder} onUpdate={updateReminder} onDelete={deleteReminder}
          onUpdateService={updateVehicleService} onNavigateToVehicles={() => setActiveTab('vehicles')} />;
      case 'ideas':
        return <IdeasPage ideas={ideas} onAdd={addIdea} onDelete={deleteIdea} />;
      case 'dreambucket':
        return <DreamBucketPage items={dreamBucket} currency={settings.currency} onAdd={addDreamItem} onUpdate={updateDreamItem} onDelete={deleteDreamItem} />;
      case 'vehicles':
        return <VehiclesPage vehicles={vehicles} vehicleServices={vehicleServices} vehicleExpenses={vehicleExpenses}
          currency={settings.currency}
          onAddVehicle={addVehicle} onUpdateVehicle={updateVehicle} onDeleteVehicle={deleteVehicle}
          onAddService={addVehicleService} onUpdateService={updateVehicleService} onDeleteService={deleteVehicleService}
          onAddExpense={addVehicleExpense} onDeleteExpense={deleteVehicleExpense} />;
      case 'grooming':
        return <GroomingPage entries={groomingEntries} currency={settings.currency} onAdd={addGroomingEntry} onDelete={deleteGroomingEntry} />;
      case 'reports':
        return <ReportsWithSummary incomes={incomes} expenses={expenses} currency={settings.currency} getMonthlyStats={getMonthlyStats} />;
      case 'settings':
        return (
          <SettingsPage settings={settings} onUpdateSettings={updateSettings}
            incomes={incomes} expenses={expenses} meetings={meetings}
            onNavigate={handleTabChange} onStartTutorial={() => setShowOnboarding(true)} />
        );
    }

  };

  return (
    <AppLockGate>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <div className="min-h-screen h-screen bg-background gradient-mesh-bg flex overflow-x-hidden max-w-[100vw]">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex-1 flex justify-center min-h-0">
          <div className="w-full max-w-2xl flex flex-col relative min-h-0">
            <PullToRefresh onRefresh={handleRefresh} className="pb-24 md:pb-8 pt-safe-top">
              <div className={`md:px-4 transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
                {renderPage()}
              </div>
            </PullToRefresh>

            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>
      </div>
    </AppLockGate>
  );

};

export default Index;
