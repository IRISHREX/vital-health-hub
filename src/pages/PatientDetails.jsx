import { useNavigate, useParams } from "react-router-dom";
import ViewPatientDialog from "@/components/dashboard/ViewPatientDialog";

export default function PatientDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  if (!id) {
    return null;
  }

  return (
    <ViewPatientDialog
      isOpen={true}
      onClose={() => navigate(-1)}
      patient={{ _id: id }}
    />
  );
}
