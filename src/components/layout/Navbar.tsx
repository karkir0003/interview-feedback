import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Award, LogOut, LogIn, ClipboardCheck, BookOpen, History, Sliders } from 'lucide-react';

export function Navbar() {
  const { user, profile, isAdmin, canGrade, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isQuestionBank = location.pathname === '/admin' && location.search.includes('tab=questions');
  const isRubrics = location.pathname === '/admin' && location.search.includes('tab=rubrics');
  const isGradeInterview = location.pathname === '/admin' && !isQuestionBank && !isRubrics;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition">
            <Award className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 tracking-tight text-base leading-tight">
              MockSignal
            </span>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Interview Feedback
            </span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="flex items-center gap-3 sm:gap-6">
          {user && (
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Interviewers & Admins can Grade and access Question Bank */}
              {canGrade && (
                <>
                  <Link
                    to="/admin"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isGradeInterview
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Grade Interview</span>
                  </Link>

                  <Link
                    to="/admin?tab=questions"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isQuestionBank
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Question Bank</span>
                  </Link>
                </>
              )}

              {/* Rubric calibration view is STRICTLY gated to admins */}
              {isAdmin && (
                <Link
                  to="/admin?tab=rubrics"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isRubrics
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  <span className="hidden sm:inline">Rubrics</span>
                </Link>
              )}

              <Link
                to="/history"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive('/history')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">My Sessions</span>
              </Link>
            </div>
          )}

          {/* User info / Auth buttons */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-6">
            {!isConfigured && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                Demo / Setup Mode
              </span>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
                    {user.email}
                  </span>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {profile?.role || 'candidate'}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Candidate'}
                </span>

                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
