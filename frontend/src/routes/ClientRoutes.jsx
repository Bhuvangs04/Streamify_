// Define all paths in a constants object for reusability
export const PATHS = {
  HOME: "/",
  LOGIN: "/login",
  FORGET: "/forget-page",
  RESET_PASSWORD: "/reset-password/:token",
  SIGNUP: "/signup",
  PROFILE: "/profile",
  WISHLIST: "/whishlist",
  PAY: "/pay",
  PAYMENT_REMINDER: "/payment-reminder",
  UNAUTHORIZED: "/Unauthorized/page",
  REPORT_LIST: "/reports/list",
  REPORT_VIEW: "/report/view/:id",
  REPORT_SUBMIT: "/report/submit",
  NOT_FOUND: "*",
  HISTORY_PAGE: "/history",
  TRANSFER_PAGE: "/transfer",
  SUSPEND_PAGE:"/suspend"
};

// Import pages
import { Main } from "../Pages/Client/Main";
import LoginPage from "../Pages/Client/Login";
import Forget from "../Pages/Client/Forget";
import ResetPassword from "../Pages/Client/ResetPage";
import CreateAccountPage from "../Pages/Client/Create";
import ProfilePage from "../Pages/Client/Profile";
import WishlistPage from "../Pages/Client/Whislist";
import Payment from "../Pages/Client/Pay";
import PaymentReminder from "../Pages/Client/Payment_Reminder";
import UnauthorizedPage from "../Pages/Client/Unauthorized";
import NotFound from "../Pages/Client/NotfoundPage";
import ReportsList from "../Pages/Client/ReportListPage";
import UserReportViewPage from "../Pages/Client/UserReportView";
import ReportSubmissionPage from "../Pages/Client/ReportSubmission";
import SuspendPage from "@/Pages/Client/SuspendPage";
import { HistoryPage } from "@/Pages/Client/History";
import TransferPages from "@/Pages/Client/Transer";

// Client routes array
const ClientRoutes = [
  // Public routes
  { path: PATHS.LOGIN, element: <LoginPage /> },
  { path: PATHS.FORGET, element: <Forget /> },
  {
    path: PATHS.RESET_PASSWORD,
    element: <ResetPassword />,
    isProtected: false,
  },
  { path: PATHS.SIGNUP, element: <CreateAccountPage /> },
  {
    path: PATHS.UNAUTHORIZED,
    element: <UnauthorizedPage />,
  },
  {
    path: PATHS.HISTORY_PAGE,
    element: <HistoryPage />,
  },
  {
    path: PATHS.SUSPEND_PAGE,
    element: <SuspendPage />,
  },
  // Protected routes
  { path: PATHS.HOME, element: <Main /> },
  { path: PATHS.PROFILE, element: <ProfilePage /> },
  { path: PATHS.WISHLIST, element: <WishlistPage /> },
  { path: PATHS.PAY, element: <Payment /> },
  {
    path: PATHS.PAYMENT_REMINDER,
    element: <PaymentReminder />,
    isProtected: true,
  },
  {
    path: PATHS.TRANSFER_PAGE,
    element: <TransferPages />,
    isProtected: true,
  },
  { path: PATHS.REPORT_LIST, element: <ReportsList /> },
  {
    path: PATHS.REPORT_VIEW,
    element: <UserReportViewPage />,
    isProtected: true,
  },
  {
    path: PATHS.REPORT_SUBMIT,
    element: <ReportSubmissionPage />,
    isProtected: true,
  },

  // Catch-all route
  { path: PATHS.NOT_FOUND, element: <NotFound /> },
];

export default ClientRoutes;
