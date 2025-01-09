import { AlertCircle } from "lucide-react";

const Index = () => {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suspend-bg to-gray-900 text-white p-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="w-16 h-16 text-suspend-accent" />
          </div>

          <h1 className="text-3xl font-bold">Account Suspended</h1>

          <div className="space-y-4">
            <p className="text-gray-300">
              Your account has been temporarily suspended due to unusual
              activity. For your security, access to your account has been
              restricted.
            </p>

            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <p className="text-sm text-gray-300 mb-2">
                Please contact our support team for assistance:
              </p>
              <a
                href="mailto:movie.hive.2024@gmail.com"
                className="text-suspend-accent hover:text-suspend-accent/80 font-medium transition-colors"
              >
                Mail us
              </a>
            </div>

            <p className="text-sm text-gray-400">
              Reference ID: #ACC-2024-{Math.random().toString(36).substr(2, 9)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
