import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorState = ({ message = "حدث خطأ أثناء تحميل البيانات", onRetry }: ErrorStateProps) => {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className={`p-4 rounded-2xl mb-4 ${
        isDark ? "bg-destructive/10" : "bg-destructive/5"
      }`}>
        <AlertCircle className="w-10 h-10 text-destructive/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground/80 mb-1">خطأ في التحميل</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 gap-2">
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
