import { useNavigate } from "react-router-dom";
import { ItemPicker } from "@/components/mobile/item-picker";
import { MobilePage } from "@/components/mobile/mobile-page";

// Find item: search (or, later, scan), tap the item, land on its page with quantity and location.
export default function FindItemPage() {
  const navigate = useNavigate();

  return (
    <MobilePage title="Find item">
      <ItemPicker onSelect={(item) => navigate(`/items/${item.id}`)} />
    </MobilePage>
  );
}
