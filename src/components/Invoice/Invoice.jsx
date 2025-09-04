import React, { useState, useEffect, useMemo, useRef } from "react";
import { FaFileInvoice, FaImage, FaTrash } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import "./Invoice.css";
import {
  FaMinusCircle,
  FaPlusCircle,
  FaArrowRight,
  FaBars,
  FaTimesCircle,
  FaSearch,
  FaEdit,
  FaShoppingCart,
  FaChevronDown,
  FaChevronUp,
  FaWhatsapp,
} from "react-icons/fa";
// import { AiOutlineBars } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import Header from "../header/Header";
import {
  fetchcustomerdata,
  fetchProducts,
  removeProduct,
  setdata,
  sendorder,
} from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { IoClose } from "react-icons/io5";
import { getAll, saveItems, addItem } from "../../DB";
import { useOnlineStatus } from "../../useOnlineStatus";
import { CATEGORY_HIERARCHY } from "../Utils/categoryHierarchy";
import { motion, AnimatePresence } from "framer-motion";
import { getNextOrderNumber } from "../Utils/OrderNumber";
import PrintButton from "../Utils/PrintButton";
import { formatOrderMessage, openWhatsApp } from "../Utils/whatsapp";

const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
  width: "90%",
};
const BOGO_ELIGIBLE_PRODUCTS = {
  "Farm fresh pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Delight pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Country spl pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Achari pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Makhni paneer pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Tandoori paneer pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Kurkura pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Mix veg pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Veggie deluxe pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Spicy chilly pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Maxican green wave ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Urban spl pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Pasta pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Veggie spl. pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
  "Pappy paneer pizza ": {
    paid: ["med", "large"],
    free: { med: "Reg", large: "med" },
  },
};

const Invoice = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productsToSend, setProductsToSend] = useState([]);
  const [Search, setSearch] = useState(""); // State for search query
  const [showPopup, setShowPopup] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedVariety, setSelectedVariety] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryVisible, setIsCategoryVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const { isOnline, checkBackend } = useOnlineStatus();
  const [isChecking, setIsChecking] = useState(false);
  // State for controlling the BOGO picker
  const [bogoPickerOpen, setBogoPickerOpen] = useState(false);
  const [bogoPaidProduct, setBogoPaidProduct] = useState(null);
  const [bogoDone, setBogoDone] = useState(new Set());
  // Add new state variables
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");

  const invoiceRef = useRef();
  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("customerInfo")) || {
          name: "",
          phone: "",
          address: "",
          otherCharges: "", 
          disposalCharges: "",
        }
      );
    } catch {
      return { name: "", phone: "", address: "", otherCharges: "", disposalCharges: "" };
    }
  });
  const phoneInputRef = useRef(null);
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);

  // default to “delivery”
  const [orderType, setOrderType] = useState("delivery");

  // two separate lists in localStorage
  const [deliveryBills, setDeliveryBills] = useState(
    () => JSON.parse(localStorage.getItem("deliveryKotData")) || []
  );
  const [dineInBills, setDineInBills] = useState(
    () => JSON.parse(localStorage.getItem("dineInKotData")) || []
  );
  const [takeawayBills, setTakeawayBills] = useState(
    () => JSON.parse(localStorage.getItem("takeawayKotData")) || []
  );
  // tracks which list to show in the modal
  const [modalType, setModalType] = useState("delivery"); // "delivery" or "dine-in"

  // inside Invoice component:
  const [expandedParent, setExpandedParent] = useState(null);

  const toggleParent = (parent) => {
    setExpandedParent(expandedParent === parent ? null : parent);
  };

  const openBillsModal = (type) => {
    setModalType(type);
    setShowKotModal(true);
  };

  // State for modal visibility and data
  const [showKotModal, setShowKotModal] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [editingBillNo, setEditingBillNo] = useState(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState(null);

  const navigate = useNavigate(); // For navigation

  const [bogoEnabled, setBogoEnabled] = useState(false);
  const [isThursday, setIsThursday] = useState(false);

    // Helper function to calculate total price
  const calculateTotalPrice = (products = []) => {
    return products.reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
  };
    // --- computed totals including otherCharges ---
  const productsTotal = calculateTotalPrice(productsToSend);
  const otherChargesAmount = parseFloat(customerInfo.otherCharges || 0) || 0;
  const disposalChargesAmount = parseFloat(customerInfo.disposalCharges || 0) || 0;
  const grandTotal = productsTotal + otherChargesAmount + disposalChargesAmount;

  // Effect to check day of week and automatically enable BOGO on Thursdays
  useEffect(() => {
    const checkDay = () => {
      const today = new Date().getDay(); // Sunday = 0, Monday = 1, ..., Thursday = 4
      const thursday = 4;
      setIsThursday(today === thursday);

      // Automatically enable BOGO on Thursdays
      if (today === thursday) {
        setBogoEnabled(true);
      } else {
        setBogoEnabled(false);
      }
    };

    // Check immediately on load
    checkDay();

    // Set up interval to check every hour in case the app is left open
    const interval = setInterval(checkDay, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  const guardAddProduct = async (e) => {
    e.preventDefault();
    if (isChecking) return;
    setIsChecking(true);

    // Get fresh status on click
    const currentStatus = await checkBackend();

    if (currentStatus) {
      navigate("/NewProduct");
    } else {
      alert("You’re offline—cannot add a new product right now.");
    }
    setIsChecking(false);
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const EXPIRY_MS = 12 * 60 * 60 * 1000;

  useEffect(() => {
    const cleanUp = (bills, setBills, storageKey) => {
      const fresh = bills.filter((order) => now - order.timestamp < EXPIRY_MS);
      if (fresh.length !== bills.length) {
        setBills(fresh);
        localStorage.setItem(storageKey, JSON.stringify(fresh));
      }
    };

    cleanUp(deliveryBills, setDeliveryBills, "deliveryKotData");
    cleanUp(dineInBills, setDineInBills, "dineInKotData");
    cleanUp(takeawayBills, setTakeawayBills, "takeawayKotData");
  }, [now, deliveryBills, dineInBills, takeawayBills]);

  // Format milliseconds to HH:mm:ss
  const formatRemaining = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const handlePressEnd = () => {
    // Clear the timeout if the user releases the press before 1 second
    clearTimeout(pressTimer);
  };

  const filteredProducts = selectedProducts
    .filter((product) =>
      product.name.toLowerCase().includes(Search.toLowerCase())
    )
    .reduce((acc, product) => {
      const category = product.category || "Others";

      // Ensure the category key exists in the accumulator
      if (!acc[category]) {
        acc[category] = [];
      }

      // Add the product to the correct category group
      acc[category].push(product);

      return acc;
    }, {});

  const location = useLocation();

  // memoize sorted category list for consistency
  const categories = useMemo(
    () => Object.keys(filteredProducts).sort((a, b) => a.localeCompare(b)),
    [filteredProducts]
  );

  // initialize activeCategory when filteredProducts first load
  useEffect(() => {
    if (categories.length) setActiveCategory(categories[0]);
  }, [categories]);

  // improved scroll‐spy
  useEffect(() => {
    const offset = 7 * 24; // px

    const onScroll = () => {
      // build array of {cat, distance} pairs
      const distances = categories.map((cat) => {
        const el = document.getElementById(cat);
        const top = el ? el.getBoundingClientRect().top : Infinity;
        return { cat, distance: top - offset };
      });

      // filter for those “above” the offset, then pick the one closest to it
      const inView = distances
        .filter((d) => d.distance <= 0)
        .sort((a, b) => b.distance - a.distance);

      setActiveCategory(inView[0]?.cat ?? categories[0]);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  useEffect(() => {
    localStorage.removeItem("productsToSend");
    setProductsToSend([]);
  }, []);
  useEffect(() => {
    const fromCustomerDetail = location.state?.from === "customer-detail";
    if (fromCustomerDetail) {
      localStorage.removeItem("productsToSend");
      setProductsToSend([]);
    }
  }, [location]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromIDB() {
      try {
        const offline = await getAll("products");
        if (cancelled) return;
        setSelectedProducts(offline);
      } catch (err) {
        console.error("Error loading from IDB:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function refreshFromServer() {
      try {
        const products = await fetchProducts();
        if (cancelled) return;
        setSelectedProducts(products);
        await saveItems("products", products);
      } catch (err) {
        console.warn("Server fetch failed, keeping IDB data:", err);
      }
    }

    hydrateFromIDB(); // 1️⃣ immediately populate from IDB & hide spinner
    refreshFromServer(); // 2️⃣ then update in background

    // also restore the cart‑to‑send list
    const stored = JSON.parse(localStorage.getItem("productsToSend")) || [];
    setProductsToSend(stored);
    localStorage.removeItem("deliveryCharge");

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist cart to IDB whenever it changes
  useEffect(() => {
    // clear old cart, then repopulate
    const syncCart = async () => {
      await saveItems(
        "cart",
        productsToSend.map((p, idx) => ({ ...p, id: idx }))
      );
    };
    if (productsToSend.length) syncCart();
  }, [productsToSend]);

  const handleOpenPopup = (product) => {
    if (product.varieties && product.varieties.length > 0) {
      setCurrentProduct(product);
      setShowPopup(true);

      const savedSelectedVarieties = JSON.parse(
        localStorage.getItem("selectedVariety") || "[]"
      );
      setSelectedVariety(
        savedSelectedVarieties.filter((v) => v.productId === product.id)
      ); // Filter by productId
    } else {
      handleAddToWhatsApp(product); // Directly add product if no varieties
    }
  };
  const handleProductClick = (product) => {
    const audio = new Audio("/sounds/click.wav"); // path from public folder
    audio.play();
    handleOpenPopup(product);
  };

  useEffect(() => {
    if (selectedVariety.length > 0) {
      localStorage.setItem("selectedVariety", JSON.stringify(selectedVariety));
    }
  }, [selectedVariety]);

  // Clear selectedVariety from localStorage when page refreshes
  useEffect(() => {
    localStorage.removeItem("selectedVariety");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCustomers = async () => {
      try {
        const resp = await fetchcustomerdata();
        const list = Array.isArray(resp) ? resp : resp?.data || [];
        if (!cancelled) setSavedCustomers(list);
      } catch (err) {
        // fallback to IndexedDB/localStorage
        const offline = await getAll("customers");
        if (!cancelled && offline && offline.length) {
          setSavedCustomers(offline);
          return;
        }
        const local = JSON.parse(localStorage.getItem("customers")) || [];
        if (!cancelled && local.length) setSavedCustomers(local);
      }
    };

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, []);

  // call this from phone input's onChange
  const handleCustomerPhoneChange = (e) => {
    const phoneValue = e.target.value;
    // allow only digits, max 10
    if (/^\d*$/.test(phoneValue) && phoneValue.length <= 10) {
      setCustomerInfo((prev) => ({ ...prev, phone: phoneValue }));

      // immediately hide suggestions when we reach 10 digits
      if (phoneValue.length === 10) {
        setPhoneSuggestions([]);
        // blur to collapse mobile suggestion/keyboard UI if needed
        if (phoneInputRef.current) phoneInputRef.current.blur();
      }
    }
  };

      // --- new handler for other charges input ---
  const handleOtherChargesChange = (e) => {
    const value = e.target.value;
    // allow empty or numeric/decimal
    if (value === "") {
      setCustomerInfo((prev) => ({ ...prev, otherCharges: "" }));
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) return;
    // keep as string for consistent UI; parse when needed
    setCustomerInfo((prev) => ({ ...prev, otherCharges: value }));
  };

    // --- new handler for disposal charges input ---
  const handledisposalChargesChange = (e) => {
    const value = e.target.value;
    // allow empty or numeric/decimal
    if (value === "") {
      setCustomerInfo((prev) => ({ ...prev, disposalCharges: "" }));
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) return;
    // keep as string for consistent UI; parse when needed
    setCustomerInfo((prev) => ({ ...prev, disposalCharges: value }));
  };
  // recompute suggestions whenever phone changes
  useEffect(() => {
    const q = (customerInfo.phone || "").trim();
    if (q === "" || q.length >= 10) {
      setPhoneSuggestions([]);
      return;
    }

    // show suggestions from savedCustomers that start with the typed prefix
    const matches = savedCustomers
      .filter((c) => String(c.phone || "").startsWith(q))
      .slice(0, 6); // limit to 6 suggestions
    setPhoneSuggestions(matches);
  }, [customerInfo.phone, savedCustomers]);

  // Add useEffect to calculate the difference when one amount is entered
  useEffect(() => {
    if (paymentMethod === "partial") {
      const total = calculateTotalPrice(productsToSend) + (parseFloat(customerInfo.otherCharges) || 0) + (parseFloat(customerInfo.disposalCharges) || 0);
      const cash = parseFloat(cashAmount) || 0;
      // If cashAmount is an empty string we consider cash = 0 but keep cash input empty so placeholder shows
      const remaining = Math.max(0, total - cash);
      // store upi as a formatted string (two decimals) so UI shows consistent numbers
      setUpiAmount(remaining.toFixed(2));
    } else {
      // clear when not partial
      setCashAmount("");
      setUpiAmount("");
    }
  }, [cashAmount, paymentMethod, productsToSend, customerInfo.otherCharges, customerInfo.disposalCharges]);

  const handleSuggestionClick = (cust) => {
    setCustomerInfo({
      name: cust.name || "",
      phone: String(cust.phone || ""),
      address: cust.address || "",
    });
    setPhoneSuggestions([]);
    if (phoneInputRef.current) {
      phoneInputRef.current.blur();
    }
  };

  const handleVarietyQuantityChange = (variety, delta, productId) => {
    setSelectedVariety((prev) => {
      let updatedVarieties = prev.map((selected) =>
        selected.size === variety.size &&
        selected.price === variety.price &&
        selected.productId === productId
          ? { ...selected, quantity: (selected.quantity || 0) + delta }
          : selected
      );

      // Remove variety if the quantity becomes less than 1
      updatedVarieties = updatedVarieties.filter(
        (selected) => selected.quantity > 0
      );

      // Save updated selectedVariety to localStorage
      localStorage.setItem("selectedVariety", JSON.stringify(updatedVarieties));

      // Update productsToSend based on the updated selectedVarieties

      return updatedVarieties;
    });
  };

  const handleVarietyChange = (variety, isChecked, productId) => {
    setSelectedVariety((prev) => {
      let updatedVarieties;
      if (isChecked) {
        updatedVarieties = [
          ...prev,
          { ...variety, quantity: 1, productId }, // Add productId to variety
        ];
      } else {
        updatedVarieties = prev.filter(
          (selected) =>
            !(
              selected.size === variety.size &&
              selected.price === variety.price &&
              selected.productId === productId
            ) // Match by productId too
        );
      }

      localStorage.setItem("selectedVariety", JSON.stringify(updatedVarieties));
      return updatedVarieties;
    });
  };

  const handleAddToWhatsApp = (product, selectedVarieties = []) => {
    const pickedSize = selectedVarieties.length
      ? selectedVarieties[0].size.toLowerCase()
      : product.size?.toLowerCase();

    // 1) Is this pizza even BOGO-eligible?
    const pizzaInfo = BOGO_ELIGIBLE_PRODUCTS[product.name];
    const eligibleSizes = pizzaInfo ? pizzaInfo.paid : [];

    const alreadyDone = bogoDone.has(product.name + pickedSize);

    if (bogoEnabled && eligibleSizes.includes(pickedSize) && !alreadyDone) {
      setBogoPaidProduct({ ...product, size: pickedSize });
      setBogoPickerOpen(true);
      return;
    }

    // Handle products with no varieties
    if (selectedVarieties.length === 0) {
      const exists = productsToSend.some(
        (prod) =>
          prod.name === product.name &&
          prod.price === product.price &&
          prod.size === product.size
      );
      // a) BOGO check — do this _before_ any state updater
      console.log({ bogoEnabled, today: new Date().getDay() });

      setProductsToSend((prev) => {
        let updated = [];
        if (!exists) {
          updated = [...prev, { ...product, quantity: 1, isFree: false }];
        } else {
          updated = prev.map((prod) =>
            prod.name === product.name &&
            prod.price === product.price &&
            prod.size === product.size
              ? { ...prod, quantity: prod.quantity + 1 }
              : prod
          );
        }

        // NEW: Apply BOGO logic for non-variety products
        if (bogoEnabled) {
          // Check if product is eligible
          if (BOGO_ELIGIBLE_PRODUCTS[product.name]) {
            // Check if free item already exists
            const freeExists = updated.some(
              (p) =>
                p.name === product.name && p.size === product.size && p.isFree
            );

            // Add free item if it doesn't exist
            if (!freeExists) {
              updated.push({
                ...product,
                price: 0,
                originalPrice: product.price,
                isFree: true,
                quantity: 1,
              });
              setBogoPaidProduct({
                ...product,
                size: product.size?.toLowerCase(),
              });
              // open our picker UI instead of adding immediately
              setBogoPickerOpen(true);
            }
          }
        }

        localStorage.setItem("productsToSend", JSON.stringify(updated));
        return updated;
      });
      return;
    }

    // Handle products with varieties
    const newProducts = selectedVarieties.map((variety) => ({
      ...product,
      ...variety,
      quantity: variety.quantity || 1,
      isFree: false,
    }));

    setProductsToSend((prev) => {
      let updated = [...prev];
      newProducts.forEach((newProd) => {
        const exists = updated.some(
          (p) =>
            p.name === newProd.name &&
            p.price === newProd.price &&
            p.size === newProd.size
        );
        if (!exists) updated.push(newProd);
        else
          updated = updated.map((p) =>
            p.name === newProd.name &&
            p.price === newProd.price &&
            p.size === newProd.size
              ? { ...p, quantity: newProd.quantity }
              : p
          );
      });
      // NEW: Apply BOGO logic for variety products
      if (bogoEnabled) {
        newProducts.forEach((prod) => {
          if (BOGO_ELIGIBLE_PRODUCTS[prod.name]) {
            const eligibleSizes = BOGO_ELIGIBLE_PRODUCTS[prod.name];
            const size = prod.size?.toLowerCase();
          }
        });
      }
      console.log(
        "BOGO pick:",
        product.name,
        pickedSize,
        BOGO_ELIGIBLE_PRODUCTS[product.name]
      );

      localStorage.setItem("productsToSend", JSON.stringify(updated));
      return updated;
    });

    setShowPopup(false);
    setSelectedVariety([]);
  };
  // Function to handle quantity changes
  const handleQuantityChange = (productName, productPrice, delta) => {
    const updatedProductsToSend = productsToSend
      .map((prod) => {
        if (prod.name === productName && prod.price === productPrice) {
          const newQuantity = prod.quantity + delta;
          if (newQuantity < 1) {
            return null; // Remove the product if quantity goes below 1
          }
          return { ...prod, quantity: newQuantity };
        }
        return prod;
      })
      .filter(Boolean); // Remove any null values

    setProductsToSend(updatedProductsToSend);
    localStorage.setItem(
      "productsToSend",
      JSON.stringify(updatedProductsToSend)
    );
  };

  // Function to remove a product from selected products and productsToSend
  const handleRemoveProduct = async (productName, productPrice) => {
    try {
      // Call the API function
      await removeProduct(productName, productPrice);

      // Remove product from the selectedProducts and productsToSend arrays
      const updatedSelectedProducts = selectedProducts.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );
      const updatedProductsToSend = productsToSend.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );

      // Update the state
      setSelectedProducts(updatedSelectedProducts);
      setProductsToSend(updatedProductsToSend);

      // Update localStorage
      localStorage.setItem("products", JSON.stringify(updatedSelectedProducts));
      localStorage.setItem(
        "productsToSend",
        JSON.stringify(updatedProductsToSend)
      );

      console.log("Product removed successfully from both MongoDB and state");
    } catch (error) {
      console.error("Error removing product:", error.message);
    }
  };

  const handleCategoryClick = (category) => {
    const categoryElement = document.getElementById(category);
    if (categoryElement) {
      // Calculate the offset position (7rem margin)
      const offset = 7 * 16; // Convert rem to pixels (assuming 1rem = 16px)
      const elementPosition = categoryElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      // Smooth scroll to the position with the offset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsCategoryVisible((prev) => !prev);

    setActiveCategory(category);
  };

  const toggleCategoryVisibility = () => {
    setIsCategoryVisible((prev) => !prev); // Toggle visibility
  };

  const getCurrentBills = () => {
    if (modalType === "delivery") return deliveryBills;
    if (modalType === "dine-in") return dineInBills;
    if (modalType === "takeaway") return takeawayBills;
    return [];
  };

  const handleKot = () => {
    if (!editingBillNo) {
      const empty = { name: "", phone: "", address: "" };
      setCustomerInfo(empty);
      localStorage.removeItem("customerInfo");

      // NEW: reset payment inputs for a fresh customer modal
      setPaymentMethod("");
      setCashAmount("");
      setUpiAmount("");
    }
    // show customer modal
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async () => {
    setIsSaving(true);

    // Validate payment method is selected
    // if (!paymentMethod) {
    //   toast.error("Please select a payment method", toastOptions);
    //   setIsSaving(false);
    //   return;
    // }

    const itemsTotal = calculateTotalPrice(productsToSend);
    const other = parseFloat(customerInfo.otherCharges) || 0;
    const disposal = parseFloat(customerInfo.disposalCharges) || 0;
    const total = itemsTotal + other + disposal;

    // Validate partial amounts
    if (paymentMethod === "partial") {
      const cash = parseFloat(cashAmount) || 0;
      const upi = parseFloat(upiAmount) || 0;

      // exact match check (allow small floating error)
      if (Math.abs(cash + upi - total) > 0.001) {
        toast.error("Partial amounts must add up to the total", toastOptions);
        setIsSaving(false);
        return;
      }
    }

    try {
      const todayKey = new Date().toLocaleDateString();
      const counter = JSON.parse(localStorage.getItem("kotCounter")) || {
        date: todayKey,
        lastNo: 50,
      };
      let nextNo;

      let orderNumberToUse;

      if (editingBillNo) {
        // we’re re‐printing an edited ticket: reuse its original number
        nextNo = editingBillNo;
        orderNumberToUse = editingOrderNumber ?? getNextOrderNumber();
      } else {
        // brand‐new KOT: bump (or reset) the counter
        nextNo = counter.date === todayKey ? counter.lastNo + 1 : 51;
        localStorage.setItem(
          "kotCounter",
          JSON.stringify({ date: todayKey, lastNo: nextNo })
        );
        orderNumberToUse = getNextOrderNumber();
      }

      // after we’ve captured it, clear edit mode so only this one re‐print reuses it
      setEditingBillNo(null);
      setEditingOrderNumber(null);

      const billNo = String(nextNo).padStart(4, "0");
      const orderId = `order_${Date.now()}`;

      const orderData = {
        id: orderId,
        orderNumber: orderNumberToUse,
        billNumber: billNo,
        orderType,
        products: productsToSend,
        totalAmount: total,
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        timestamp: new Date().toISOString(),
        otherCharges: other,
        disposalCharges: disposal,
        paymentMethod,
        cashAmount:
          paymentMethod === "cash"
            ? total
            : paymentMethod === "partial"
            ? parseFloat(cashAmount) || 0
            : 0,
        upiAmount:
          paymentMethod === "upi"
            ? total
            : paymentMethod === "partial"
            ? parseFloat(upiAmount) || 0
            : 0,
      };

      console.log("orderData: ", orderData)
      const customerData = {
        id: orderId,
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        timestamp: new Date().toISOString(),
      };

      // Save data to database - with improved error handling
      try {
        if (navigator.onLine) {
          try {
            // Online - save to server
            await sendorder(orderData);
            await setdata(customerData);
          } catch (serverError) {
            console.error("Server error, saving locally:", serverError);
            // If server fails, save to IndexedDB instead
            await addItem("orders", orderData);
            await addItem("customers", customerData);
            toast.info("You're offline - order saved locally", toastOptions);
          }
        } else {
          // Offline - save to IndexedDB
          await addItem("orders", orderData);
          await addItem("customers", customerData);
          toast.info("You're offline - data saved locally", toastOptions);
        }
      } catch (error) {
        console.error("Error saving data:", error);
        toast.error("Error saving data", toastOptions);
      }

      // Append current order snapshot
      const kotEntry = {
        billNo: billNo,
        orderNo: orderNumberToUse,
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        items: productsToSend,
        orderType,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerAddress: customerInfo.address,
        otherCharges: other,
        disposalCharges: disposal,
      };

      if (orderType === "delivery") {
        const next = [kotEntry, ...deliveryBills];
        setDeliveryBills(next);
        localStorage.setItem("deliveryKotData", JSON.stringify(next));
      } else if (orderType === "dine-in") {
        const next = [kotEntry, ...dineInBills];
        setDineInBills(next);
        localStorage.setItem("dineInKotData", JSON.stringify(next));
      } else if (orderType === "takeaway") {
        const next = [kotEntry, ...takeawayBills];
        setTakeawayBills(next);
        localStorage.setItem("takeawayKotData", JSON.stringify(next));
      }

      // Clear current productsToSend
      setProductsToSend([]);
      localStorage.removeItem("productsToSend");

      // reset payment fields so next open is empty
      setPaymentMethod("");
      setCashAmount("");
      setUpiAmount("");
      setCustomerInfo({ name: "", phone: "", address: "", otherCharges: "", disposalCharges: ""});

      setShowCustomerModal(false);
      setPhoneSuggestions([]);
      const printArea = document.getElementById("sample-section");
      if (!printArea) {
        console.warn("No sample-section found to print.");
        return;
      }

      const header = `
<div style="text-align:center; font-weight:700; margin-bottom:8px;">
Bill No. ${billNo}
</div>
`;

 // include other charges line in print
      const otherLine = other > 0 ? `<div>Other Charges: Rs. ${other}</div>` : "";
      const disposalLine = disposal > 0 ? `<div>Disposal Charges: Rs. ${disposal}</div>` : "";

      const printContent =
        header +
        (customerInfo.name ? `<div>Name: ${customerInfo.name}</div>` : "") +
        (customerInfo.phone ? `<div>Phone: ${customerInfo.phone}</div>` : "") +
        printArea.innerHTML;

      const win = window.open("", "", "width=600,height=400");
      const style = `<style>
@page { size: 58mm 400mm; margin:0; }
@media print {
  body{ width: 58mm !important; margin:0; padding:4mm; font-size:1.2rem; }
  .product-item{ display:flex; justify-content:space-between; margin-bottom:1rem;}
  .hr{ border:none; border-bottom:1px solid #000; margin:2px 0;}
  .invoice-btn{ display:none; }
    .icon{
      display: none !important;
}
      .icon span {
      display: block;
      }
.s-s-h-1, .s-s-t-1, .s-s-f-1, .s-s-f-2 {
display: none !important;
}
</style>`;

      win.document.write(
        `<html>
    <head>
    <title>KOT Ticket</title>
    ${style}
      </head>
      <body>
      ${printContent}
      </body>
      </html>`
      );
      win.document.close();
      win.focus();
      win.print();
      win.close();

      const empty = { name: "", phone: "", address: "" };
      setCustomerInfo(empty);
      localStorage.removeItem("customerInfo");
    } catch (error) {
      console.error("Error in KOT process:", error);
      toast.error("Error processing KOT", toastOptions);
    } finally {
      setIsSaving(false); // End loading Regardless of success/error
    }
  };

  // CASH input handler: allow empty string, numeric values; if greater than total show toast and cap to total
  const handleCashChange = (e) => {
    const value = e.target.value;
    // allow empty
    if (value === "") {
      setCashAmount("");
      return;
    }

    // allow only numeric/decimal input
    if (!/^\d*\.?\d*$/.test(value)) return;

    const num = parseFloat(value);
    const total = calculateTotalPrice(productsToSend);
    if (!isNaN(num) && num > total) {
      toast.error("Cash cannot be greater than total", toastOptions);
      // cap to total (keeps user flow smooth and avoids invalid state)
      setCashAmount(total.toFixed(2));
      return;
    }

    setCashAmount(value);
  };

  const handleCreateInvoice = (orderItems, type) => {
    // Extract customer details from KOT entry
    const { customerName, customerPhone, customerAddress } = orderItems;
    // save the items and the order type
    localStorage.setItem("productsToSend", JSON.stringify(orderItems.items));
    localStorage.setItem("orderType", type);
    // also pass via react-router state (optional, but nice)
    navigate("/customer-detail", {
      state: {
        orderType: type,
        billNo: orderItems.billNo,
        orderNo: orderItems.orderNo,

        customerInfo: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
        },
      },
    });
    console.log("handleCreateInvoice", orderItems.billNo);
    setShowKotModal(false);
  };

  const deleteKot = (idx) => {
    if (modalType === "delivery") {
      const updated = deliveryBills.filter((_, i) => i !== idx);
      setDeliveryBills(updated);
      localStorage.setItem("deliveryKotData", JSON.stringify(updated));
    } else if (modalType === "dine-in") {
      const updated = dineInBills.filter((_, i) => i !== idx);
      setDineInBills(updated);
      localStorage.setItem("dineInKotData", JSON.stringify(updated));
    } else if (modalType === "takeaway") {
      const updated = takeawayBills.filter((_, i) => i !== idx);
      setTakeawayBills(updated);
      localStorage.setItem("takeawayKotData", JSON.stringify(updated));
    }
  };

  const editKot = (order, idx) => {
    setEditingBillNo(order.billNo);
    setEditingOrderNumber(order.orderNo ?? null);
    // Remove from the correct list
    if (modalType === "delivery") {
      const updated = deliveryBills.filter((_, i) => i !== idx);
      setDeliveryBills(updated);
      localStorage.setItem("deliveryKotData", JSON.stringify(updated));
    } else if (modalType === "dine-in") {
      const updated = dineInBills.filter((_, i) => i !== idx);
      setDineInBills(updated);
      localStorage.setItem("dineInKotData", JSON.stringify(updated));
    } else if (modalType === "takeaway") {
      const updated = takeawayBills.filter((_, i) => i !== idx);
      setTakeawayBills(updated);
      localStorage.setItem("takeawayKotData", JSON.stringify(updated));
    }

    // Load into current products
    setProductsToSend(order.items);
    localStorage.setItem("productsToSend", JSON.stringify(order.items));

    // --- NEW: restore customer info from the KOT entry ---
    const restoredCustomer = {
      name: order.customerName || order.customerInfo?.name || "",
      phone: order.customerPhone || order.customerInfo?.phone || "",
      address: order.customerAddress || order.customerInfo?.address || "",
    };
    setCustomerInfo(restoredCustomer);
    localStorage.setItem("customerInfo", JSON.stringify(restoredCustomer));
    setShowKotModal(false);
  };

  const TOP_CATEGORIES = [
    "pizza",
    "Pizza Double topping",
    "Pizza veg1",
    "Pizza veg2",
    "Pizza veg3",
    "Pizza veg4",
    "Pizza veg5",
    "Pizza small",
    "Pizza combo",
    "Pizza crust",
    "Extra topping",
    "Burger",
    "Calzone",
    "Drinks",
    "Fries",
    "Garlic",
    "Noodles",
    "Sides",
    "Snacks",
    "Sweetcorn",
  ];

  const sortByTopCategories = (list) => {
    return list.sort((a, b) => {
      const ai = TOP_CATEGORIES.findIndex(
        (cat) => cat.toLowerCase() === a.toLowerCase()
      );
      const bi = TOP_CATEGORIES.findIndex(
        (cat) => cat.toLowerCase() === b.toLowerCase()
      );

      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;

      return a.localeCompare(b);
    });
  };

  const categoriess = useMemo(() => {
    return sortByTopCategories(Object.keys(filteredProducts));
  }, [filteredProducts]);

  return (
    <div>
      <ToastContainer />
      <Header
        headerName="Urban Pizzeria"
        setSearch={setSearch}
        onClick={toggleCategoryVisibility}
      />
      <div className="invoice-container">
        {isCategoryVisible && (
          <div className="category-barr">
            <div className="category-b">
              <div className="category-bar">
                {Object.keys(CATEGORY_HIERARCHY)
                  .sort((a, b) =>
                    sortByTopCategories([a, b])[0] === a ? -1 : 1
                  )
                  .map((parent) => {
                    const allSubs = CATEGORY_HIERARCHY[parent];
                    // keep only the subs you actually have, then sort them A→Z
                    const subs = allSubs
                      .filter((sub) => filteredProducts[sub])
                      .sort((a, b) =>
                        sortByTopCategories([a, b])[0] === a ? -1 : 1
                      );

                    if (!subs.length) return null;

                    // single-sub case: show the sub directly
                    if (subs.length === 1) {
                      const sub = subs[0];
                      return (
                        <button
                          key={sub}
                          className={`category-btn single-btn ${
                            activeCategory === sub ? "active" : ""
                          }`}
                          onClick={() => handleCategoryClick(sub)}
                        >
                          {sub}
                        </button>
                      );
                    }

                    // multi-sub case: dropdown parent + sorted subs
                    const isOpen = expandedParent === parent;
                    return (
                      <div key={parent} className="parent-group">
                        <button
                          className={`category-btn parent-btn ${
                            isOpen ? "open" : ""
                          }`}
                          onClick={() => toggleParent(parent)}
                        >
                          <span>{parent}</span>
                          {isOpen ? (
                            <FaChevronUp className="chevron-icon" />
                          ) : (
                            <FaChevronDown className="chevron-icon" />
                          )}
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              className="sub-category-list"
                              initial={{ scaleY: 0, opacity: 0 }}
                              animate={{ scaleY: 1, opacity: 1 }}
                              exit={{ scaleY: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              style={{
                                overflow: "hidden",
                                transformOrigin: "top",
                              }}
                            >
                              {subs.map((sub) => (
                                <button
                                  key={sub}
                                  className={`category-btn sub-btn ${
                                    activeCategory === sub ? "active" : ""
                                  }`}
                                  onClick={() => handleCategoryClick(sub)}
                                >
                                  {sub}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        <div className="main-section">
          <div className="main">
            {loading ? (
              // Display loading effect when fetching data
              <div className="lds-ripple">
                <div></div>
                <div></div>
              </div>
            ) : Object.keys(filteredProducts).length > 0 ? (
              categoriess.map((category, index) => (
                <div key={category} className="category-block">
                  <h2 className="category" id={category}>
                    {category}
                  </h2>

                  <div key={index} className="category-container">
                    {filteredProducts[category].map((product, idx) => {
                      const isSelected = productsToSend.some(
                        (p) =>
                          p.name === product.name &&
                          (!product.varieties?.length ||
                            product.varieties.some(
                              (v) => v.price === p.price && v.size === p.size
                            ))
                      );

                      return (
                        <div
                          key={idx}
                          className={`main-box ${
                            isSelected ? "highlighted" : ""
                          }`}
                          onClick={() => handleProductClick(product)}
                        >
                          <div
                            className="sub-box"
                            style={{ position: "relative" }}
                          >
                            <h4 className="p-name">
                              {product.name}
                              {product.varieties &&
                              Array.isArray(product.varieties) &&
                              product.varieties[0]?.size
                                ? ` (${product.varieties[0].size})`
                                : ""}
                            </h4>
                            <p className="p-name-price">
                              Rs.{" "}
                              {product.price
                                ? product.price // Use product price if it exists
                                : product.varieties.length > 0
                                ? product.varieties[0].price // Fallback to first variety price
                                : "N/A"}{" "}
                              {/* Handle case when neither price nor varieties are available */}
                            </p>
                          </div>
                          {productsToSend
                            .filter((prod) => prod.name === product.name)
                            .map((prod, i) => (
                              <span key={i} className="quantity-badge">
                                <span>
                                  <FaShoppingCart
                                    style={{ marginRight: "4px" }}
                                  />
                                  {prod.quantity}
                                </span>
                              </span>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </div>

        {/* BOGO Toggle */}
        <div
          className="bogo-toggle"
          style={{ padding: "1rem", textAlign: "center" }}
        >
          {isThursday ? (
            <label style={{ fontSize: "1.2rem", marginTop: "5rem" }}>
              <input
                type="checkbox"
                checked={bogoEnabled}
                onChange={() => {
                  if (isThursday) {
                    setBogoEnabled(!bogoEnabled);
                  } else {
                    toast.error(
                      "BOGO offer is only available on Thursdays",
                      toastOptions
                    );
                  }
                }}
                disabled={!isThursday}
                style={{ marginRight: "0.5rem" }}
              />
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#4CAF50",
                  marginTop: "5px",
                }}
              >
                Buy 1 Get 1 Free free pizza
              </div>
            </label>
          ) : (
            <div
              style={{ fontSize: "0.9rem", color: "#ff6b6b", marginTop: "5px" }}
            ></div>
          )}
        </div>

        {productsToSend.length > 0 ? (
          <div className="sample-section">
            <div className="check-container">
              <>
                <ul className="product-list" id="sample-section">
                  <hr className="hr" />
                  <li
                    className="product-item-heading"
                    style={{ display: "flex" }}
                  >
                    <div
                      style={{
                        width: "10%",
                      }}
                    >
                      <span className="s-s-h-1">No.</span>
                    </div>
                    <div
                      style={{
                        width: "50%",
                        textAlign: "center",
                      }}
                    >
                      <span className="s-s-h-2">Name</span>
                    </div>
                    <div
                      style={{
                        width: "25%",
                        textAlign: "center",
                      }}
                    >
                      <span className="s-s-h-3">Qty</span>
                    </div>
                    <div
                      style={{
                        width: "15%",
                        textAlign: "right",
                        paddingRight: "10px",
                      }}
                    >
                      <span className="s-s-h-4">Price</span>
                    </div>
                  </li>
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  {productsToSend.map((product, index) => (
                    <>
                      <li
                        key={index}
                        className="product-item"
                        style={{ display: "flex" }}
                      >
                        <div
                          style={{
                            width: "10%",
                          }}
                        >
                          <span className="s-s-t-1">{index + 1}.</span>
                        </div>
                        <div style={{ width: "50%" }}>
                          <span>
                            {product.name}
                            {product.size ? ` (${product.size})` : ""}
                            {/* Add FREE label here if it's a free item */}
                            {product.isFree && (
                              <span className="free-label"> (FREE)</span>
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            width: "25%",
                            textAlign: "center",
                          }}
                        >
                          <div className="quantity-btn">
                            <button
                              className="icon"
                              onClick={() =>
                                handleQuantityChange(
                                  product.name,
                                  product.price,
                                  -1
                                )
                              }
                              // disabled={product.quantity <= 1}
                            >
                              <FaMinusCircle />
                            </button>
                            <span>{product.quantity}</span>
                            <button
                              className="icon"
                              onClick={() =>
                                handleQuantityChange(
                                  product.name,
                                  product.price,
                                  1
                                )
                              }
                            >
                              <FaPlusCircle />
                            </button>
                          </div>
                        </div>{" "}
                        <div
                          style={{
                            width: "15%",
                            textAlign: "right",
                            paddingRight: "10px",
                          }}
                        >
                          <div>
                            {product.isFreeBogo ? (
                              <span className="s-s-t-4">FREE</span>
                            ) : (
                              <span className="s-s-t-4">
                                {product.price * product.quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                      <hr className="hr" />
                    </>
                  ))}
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  <li className="product-item" style={{ display: "flex" }}>
                    <div
                      style={{
                        width: "85%",
                        textAlign: "center",
                        fontWeight: 800,
                      }}
                      className="s-s-f-1"
                    >
                      <span>Total</span>
                    </div>
                    <div
                      style={{
                        width: "15%",
                        textAlign: "right",
                        fontWeight: 900,
                        paddingRight: "10px",
                      }}
                      className="s-s-f-2"
                    >
                      <span>{calculateTotalPrice(productsToSend)}</span>
                    </div>
                  </li>
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  {/* <hr className="hr" /> */}
                  <div
                    className="s-s-o-t"
                    style={{
                      textAlign: "center",
                      fontSize: "2rem",
                      fontWeight: 800,
                    }}
                  >
                    {orderType === "delivery"
                      ? "Delivery"
                      : orderType === "dine-in"
                      ? "Dine‑In"
                      : "Takeaway"}
                  </div>
                </ul>
                <div className="order-type">
                  {["delivery", "dine-in", "takeaway"].map((type) => (
                    <label key={type} className="order-option">
                      <input
                        type="radio"
                        name="orderType"
                        value={type}
                        checked={orderType === type}
                        onChange={() => setOrderType(type)}
                      />
                      <span className="option-content">
                        <em>
                          {type === "delivery"
                            ? "Delivery"
                            : type === "dine-in"
                            ? "Dine‑In"
                            : "Takeaway"}
                        </em>
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleKot}
                  className="kot-btn"
                  style={{ borderRadius: "0" }}
                >
                  <h2> Print Kot </h2>
                </button>
              </>
            </div>
          </div>
        ) : (
          <p className="no-products">No products found </p>
        )}
      </div>
      <div className="invoice-btn">
        <button onClick={guardAddProduct} className="invoice-kot-btn">
          <h2> + PRODUCT </h2>
        </button>
        <button
          onClick={() => openBillsModal("delivery")}
          className="invoice-next-btn"
        >
          <h2>Delivery Bills ({deliveryBills.length})</h2>
        </button>
        <button
          onClick={() => openBillsModal("dine-in")}
          className="invoice-next-btn"
        >
          <h2>Dine-In Bills ({dineInBills.length})</h2>
        </button>
        <button
          onClick={() => openBillsModal("takeaway")}
          className="invoice-next-btn"
        >
          <h2>Takeaway Bills ({takeawayBills.length})</h2>
        </button>
      </div>
      {showKotModal && (
        <div className="modal-overlay" onClick={() => setShowKotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalType === "delivery"
                ? "Delivery"
                : modalType === "dine-in"
                ? "Dine-In"
                : "Takeaway"}{" "}
              Bills
            </h3>
            {getCurrentBills().length === 0 && <p>No bills found.</p>}

            <button
              className="close-btn"
              onClick={() => setShowKotModal(false)}
            >
              <IoClose />
            </button>
            <div className="kot-list">
              {getCurrentBills().length === 0 && <p>No bills found.</p>}
              {(modalType === "delivery"
                ? deliveryBills
                : modalType === "dine-in"
                ? dineInBills
                : takeawayBills
              ).map((order, idx) => {
                const remaining = EXPIRY_MS - (now - order.timestamp);

                // Calculate total amount
                const totalAmount = order.items.reduce(
                  (acc, item) => acc + item.price * item.quantity,
                  0
                );
                return (
                  <div key={idx} className="kot-entry">
                    <h4 className="kot-timer">
                      Bill Expire in <span>{formatRemaining(remaining)}</span>
                    </h4>
                    <h4>
                      Bill No. {order.billNo}
                      <span className="kot-date">{order.date}</span>
                    </h4>
                    <h4>Order No. RT-{order.orderNo}</h4>
                    <hr />
                    <h4>
                      {order.customerName && (
                        <p style={{ fontWeight: 700 }}>{order.customerName}</p>
                      )}
                      {order.customerPhone && (
                        <p style={{ fontWeight: 700 }}>{order.customerPhone}</p>
                      )}
                    </h4>

                    <hr />
                    <ul>
                      {order.items.map((item, i) => (
                        <>
                          <li key={i} className="kot-product-item">
                            <span>
                              {item.name}
                              {item.size ? ` ~${item.size}` : ""} x{" "}
                              {item.quantity}
                            </span>
                            <span>
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </li>
                        </>
                      ))}
                    </ul>

                     {/* show extra charges (only if present) */}
        {order.otherCharges > 0 && (
          <div className="kot-extra-line" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span>Other Charges</span>
            <span>₹{order.otherCharges.toFixed(2)}</span>
          </div>
        )}

        {order.disposalCharges > 0 && (
          <div className="kot-extra-line" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span>Disposal Charges</span>
            <span>₹{order.disposalCharges.toFixed(2)}</span>
          </div>
        )}
                    {/* Show total amount */}
                    <div className="kot-total">
                      <strong>Total </strong>
                      <strong>₹{(totalAmount + order.disposalCharges + order.otherCharges).toFixed(2)}</strong>
                    </div>
                    <div className="kot-entry-actions">
                      <button
                        onClick={() => {
                          // Build an order-like object from your stored order shape
                          const orderObj = {
                            billNumber: order.billNo,
                            orderNumber: order.orderNo,
                            orderType: modalType,
                            name: order.customerName,
                            phone: order.customerPhone,
                            address: order.customerAddress,
                            items: order.items || order.products || [],
                            delivery: order.delivery || 0,
                            discount: order.discount || 0,
                          };
                          const msg = formatOrderMessage(orderObj);
                          openWhatsApp(order.customerPhone, msg);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "green",
                        }}
                        title="Send via WhatsApp"
                      >
                        <FaWhatsapp style={{ fontSize: "1.5rem" }} />
                      </button>
                      <PrintButton
                        order={{
                          orderNumber: order.orderNo,
                          billNumber: order.billNo,
                          orderType: modalType,
                          products: order.items,
                          name: order.customerName,
                          phone: order.customerPhone,
                          address: order.customerAddress,
                          timestamp: order.timestamp,
                          delivery: order.delivery || 0,
                          discount: order.discount || 0,
                          otherCharges: order.otherCharges || 0,
                          disposalCharges: order.disposalCharges || 0,

                        }}
                        label={<FaFileInvoice size={20} />}
                        className="invoice-action-icon action-icon"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showPopup && currentProduct && currentProduct.varieties?.length > 0 && (
        <div className="popup-overlay">
          <div className="popup-contentt">
            <FaTimesCircle
              className="close-icon"
              onClick={() => setShowPopup(false)}
            />
            <h3>Select Size for {currentProduct.name}</h3>
            {currentProduct.varieties.map((variety, index) => (
              <div key={index} className="variety-option">
                <label className="variety-label">
                  <input
                    type="checkbox"
                    name="variety"
                    value={index}
                    checked={selectedVariety.some(
                      (v) =>
                        v.size === variety.size &&
                        v.price === variety.price &&
                        v.productId === currentProduct.id
                    )}
                    onChange={(e) =>
                      handleVarietyChange(
                        variety,
                        e.target.checked,
                        currentProduct.id
                      )
                    }
                  />
                  <span>
                    {variety.size.charAt(0).toUpperCase()} ~ ₹ {variety.price}
                  </span>
                </label>

                {selectedVariety.some(
                  (v) => v.size === variety.size && v.price === variety.price
                ) && (
                  <div className="quantity-buttons">
                    <button
                      onClick={() =>
                        handleVarietyQuantityChange(
                          variety,
                          -1,
                          currentProduct.id
                        )
                      }
                      disabled={variety.quantity <= 1}
                    >
                      <FaMinusCircle />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={
                        selectedVariety.find(
                          (v) =>
                            v.size === variety.size && v.price === variety.price
                        )?.quantity || 1
                      }
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value, 10);
                        handleVarietyQuantityChange(
                          variety,
                          quantity - variety.quantity
                        );
                      }}
                    />
                    <button
                      onClick={() =>
                        handleVarietyQuantityChange(
                          variety,
                          1,
                          currentProduct.id
                        )
                      }
                    >
                      <FaPlusCircle />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() =>
                handleAddToWhatsApp(currentProduct, selectedVariety)
              }
              disabled={selectedVariety?.length === 0}
              className="save-btn"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {bogoPickerOpen && bogoPaidProduct && (
        <div className="bogo-picker-overlay">
          <div className="bogo-picker-modal">
            <h3>Choose your free pizza</h3>

            {(() => {
              const normalize = (s) => (s || "").toLowerCase();
              const capitalize = (s) =>
                s ? s[0].toUpperCase() + s.slice(1) : s;

              const pizzaInfo = BOGO_ELIGIBLE_PRODUCTS[bogoPaidProduct.name];
              if (!pizzaInfo) return <p>No BOGO options available.</p>;

              const paidSizeKey = normalize(bogoPaidProduct.size);
              const freeSizeRaw = pizzaInfo.free?.[paidSizeKey];
              const freeSize = normalize(freeSizeRaw);

              if (!freeSizeRaw) return <p>No free options for this size.</p>;

              // Find pizzas on the menu that actually have the free size in their varieties
              // (don't require that they appear in info.paid — that was blocking Reg)
              const freeOptions = selectedProducts
                .filter(
                  (p) =>
                    Array.isArray(p.varieties) &&
                    p.varieties.some((v) => v.size?.toLowerCase() === freeSize)
                )
                // optional: only include pizzas from BOGO_ELIGIBLE_PRODUCTS if you want to restrict
                .filter((p) =>
                  Object.prototype.hasOwnProperty.call(
                    BOGO_ELIGIBLE_PRODUCTS,
                    p.name
                  )
                )
                .map((p) => p.name);

              return freeOptions.length ? (
                <ul>
                  {freeOptions.map((name) => (
                    <li key={name}>
                      <button
                        onClick={() => {
                          const freeProd = selectedProducts.find(
                            (p) => p.name === name
                          );
                          if (!freeProd) return;
                          const freeVariety = freeProd.varieties.find(
                            (v) => v.size.toLowerCase() === freeSize
                          );
                          if (!freeVariety) return;

                          setProductsToSend((prev) => [
                            ...prev,
                            {
                              ...freeProd,
                              size: freeVariety.size, // keep original casing for display
                              price: 0,
                              isFree: true,
                              quantity: 1,
                              originalPrice: freeVariety.price,
                              paidProduct: bogoPaidProduct.name,
                              paidSize: paidSizeKey,
                            },
                          ]);

                          setBogoDone((prev) => {
                            const s = new Set(prev);
                            s.add(bogoPaidProduct.name + paidSizeKey);
                            return s;
                          });
                          setBogoPickerOpen(false);
                          setBogoPaidProduct(null);
                        }}
                      >
                        {name} ({capitalize(freeSize)})
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No alternative pizzas available in {freeSize.toUpperCase()}{" "}
                  size.
                </p>
              );
            })()}

            <button
              className="close-picker"
              onClick={() => {
                setBogoPickerOpen(false);
                setBogoPaidProduct(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="modal-overlayy">
          <div className="modal-contentt" onClick={(e) => e.stopPropagation()}>
            <h3>Customer Details</h3>
            {/* Loading overlay */}
            <div className="modal-body">
              {isSaving && (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Saving and printing KOT...</p>
                </div>
              )}
              <input
                type="text"
                placeholder="Customer Name"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
                disabled={isSaving}
              />
              <input
                type="text"
                placeholder="Customer Phone"
                value={customerInfo.phone}
                onChange={handleCustomerPhoneChange}
                disabled={isSaving}
              />
              {phoneSuggestions.length > 0 && (
                <ul
                  className="suggestions"
                  style={{
                    position: "relative",
                    zIndex: 3000,
                    background: "#fff",
                    border: "1px solid #ddd",
                    listStyle: "none",
                    margin: "6px 0",
                    padding: 0,
                    width: "100%",
                    maxHeight: "150px",
                    overflowY: "auto",
                    borderRadius: "8px",
                  }}
                >
                  {phoneSuggestions.map((s) => (
                    <li
                      key={s.phone + (s.name || "")}
                      onClick={() => handleSuggestionClick(s)}
                      style={{
                        padding: ".5rem",
                        cursor: "pointer",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <strong>{s.phone}</strong> — {s.name || "No name"}
                      {s.address ? (
                        <div style={{ fontSize: "0.9rem", color: "#666" }}>
                          {s.address}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <input
                type="text"
                placeholder="Customer Address"
                value={customerInfo.address}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, address: e.target.value })
                }
                disabled={isSaving}
              />

                  {/* NEW: Other Charges input */}
              <div className="form-group">
                <input
                  id="otherCharges"
                  type="text"
                  placeholder="other charges (optional)"
                  value={customerInfo.otherCharges}
                  onChange={handleOtherChargesChange}
                  disabled={isSaving}
                />
              </div>

                     {/* NEW: disposal Charges input */}
              <div className="form-group">
                <input
                  id="disposalCharges"
                  type="text"
                  placeholder="disposal Charges (optional)"
                  value={customerInfo.disposalCharges}
                  onChange={handledisposalChargesChange}
                  disabled={isSaving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="paymentMethod">Payment Method *</label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isSaving}
                  required
                >
                  <option value="">Select Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              {/* When partial is selected show only a Cash field (editable). UPI is computed automatically and shown as read-only. */}
              {paymentMethod === "partial" && (
                <div className="partial-payment-fields">
                  <div className="form-group">
                    <label htmlFor="cashAmount">Cash Amount</label>
                    <input
                      id="cashAmount"
                      type="text"
                      placeholder="Enter cash amount"
                      value={cashAmount}
                      onChange={handleCashChange}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="form-group">
                    <label>UPI Amount (auto)</label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Enter upi amount"
                      value={upiAmount}
                    />
                  </div>
                </div>
              )}
              <div className="modal-buttons">
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setPaymentMethod("");
                    setCashAmount("");
                    setUpiAmount("");
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button onClick={handleCustomerSubmit} disabled={isSaving}>
                  {isSaving ? "Processing..." : "Save & Print KOT"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
