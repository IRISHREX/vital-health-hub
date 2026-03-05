import { useLocation, useNavigate, useParams } from "react-router-dom";
import ViewPatientDialog from "@/components/dashboard/ViewPatientDialog";

export default function PatientDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  if (!id) {
    return null;
  }

  const initialPatient = location.state?.patient;
  const closeTarget = location.state?.from;

  const handleClose = () => {
    if (typeof closeTarget === "string" && closeTarget) {
      navigate(closeTarget, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/patients", { replace: true });
  };

  return (
    <ViewPatientDialog
      isOpen={true}
      onClose={handleClose}
      patient={initialPatient ? { ...initialPatient, _id: initialPatient._id || id } : { _id: id }}
    />
  );
}
