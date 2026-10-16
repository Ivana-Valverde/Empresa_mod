document.addEventListener("DOMContentLoaded", async function () {
    const methods = document.querySelectorAll(".method-button");

    const cardPanel = document.getElementById("panel-tarjeta");
    const walletPanel = document.getElementById("panel-billetera");
    const paypalPanel = document.getElementById("panel-paypal");

    const walletTitle = document.getElementById("wallet-title");
    const walletQR = document.getElementById("wallet-qr");
    const walletButton = document.getElementById("btn-wallet");
    const payButton = document.getElementById("btn-pay");
    const paypalButton = document.getElementById("btn-paypal");
    const result = document.getElementById("payment-result");

    let selectedMethod = "tarjeta";
    let course = null;        // curso real traído de Supabase
    let processing = false;   // evita doble clic

    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");

    // ---------- Resumen del curso ----------
    function getPrice() {
        return document.getElementById("summary-price").textContent.trim();
    }

    function setSummary(data) {
        document.getElementById("summary-title").textContent = data.title;
        document.getElementById("summary-category").textContent = data.category;
        document.getElementById("summary-desc").textContent = data.desc;
        document.getElementById("summary-price").textContent = data.price;

        // La imagen solo se acepta si viene de rutas conocidas
        const img = params.get("img");
        if (img && (img.startsWith("img/") || img.startsWith("https://images.unsplash.com/"))) {
            document.getElementById("summary-img").src = img;
        }
    }

    function setPayButtonsEnabled(enabled) {
        payButton.disabled = !enabled;
        walletButton.disabled = !enabled;
        paypalButton.disabled = !enabled;
    }

    async function loadCourse() {
        if (!slug) {
            result.textContent = "No se indicó qué curso comprar. Vuelve al catálogo.";
            setPayButtonsEnabled(false);
            return;
        }

        const { data, error } = await db
            .from("courses")
            .select("id, slug, titulo, categoria, descripcion, precio")
            .eq("slug", slug)
            .single();

        if (error || !data) {
            result.textContent = "No encontramos ese curso. Vuelve al catálogo.";
            setPayButtonsEnabled(false);
            return;
        }

        course = data;
        setSummary({
            title: data.titulo,
            category: data.categoria || "Curso",
            desc: data.descripcion || params.get("desc") || "",
            price: "S/." + Number(data.precio).toFixed(2)
        });
        updateButtons();
    }

    // ---------- Textos de los botones ----------
    function updateButtons() {
        payButton.textContent = "Simular pago de " + getPrice() + " PEN";

        walletButton.textContent =
            "Simular pago con " +
            (selectedMethod === "plin" ? "Plin" : "Yape") +
            " · " + getPrice();

        paypalButton.textContent = "Simular pago con PayPal · " + getPrice();
    }

    // ---------- Selector de método ----------
    methods.forEach(function (button) {
        button.addEventListener("click", function () {
            selectedMethod = button.dataset.method;

            methods.forEach(function (item) {
                const isSelected = item === button;
                item.classList.toggle("selected", isSelected);
                item.setAttribute("aria-pressed", String(isSelected));
            });

            cardPanel.hidden = selectedMethod !== "tarjeta";
            walletPanel.hidden =
                selectedMethod !== "yape" && selectedMethod !== "plin";
            paypalPanel.hidden = selectedMethod !== "paypal";

            if (selectedMethod === "yape" || selectedMethod === "plin") {
                const name = selectedMethod === "yape" ? "Yape" : "Plin";
                walletTitle.textContent = "Paga con " + name;
                walletQR.src = selectedMethod === "yape" ? "img/qr.jpeg" : "img/plin.png";
                walletQR.alt = "QR de demostración de " + name;
            }

            result.textContent = "";
            updateButtons();
        });
    });

    // ---------- Formato de campos de tarjeta ----------
    document.getElementById("card-number").addEventListener("input", function (event) {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
        event.target.value = digits.replace(/(.{4})(?=.)/g, "$1 ");
    });

    document.getElementById("card-expiry").addEventListener("input", function (event) {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
        event.target.value = digits.length > 2
            ? digits.slice(0, 2) + "/" + digits.slice(2)
            : digits;
    });

    // ---------- Registrar el pago en Supabase ----------
    async function completePayment(methodName) {
        if (processing) return;
        if (!course) {
            result.textContent = "No hay un curso válido para pagar.";
            return false;
        }

        const { data: { session } } = await db.auth.getSession();
        if (!session) {
            alert("Tu sesión expiró. Inicia sesión de nuevo.");
            window.location.href = "iniciar.html";
            return false;
        }

        processing = true;
        setPayButtonsEnabled(false);
        result.textContent = "Procesando pago de demostración...";

        const { error } = await db.rpc("demo_pagar_curso", { p_slug: course.slug });

        processing = false;

        if (error) {
            console.error(error);
            setPayButtonsEnabled(true);
            result.textContent = "No se pudo registrar el pago. Inténtalo de nuevo.";
            return false;
        }

        result.textContent =
            "Pago de demostración con " + methodName +
            " completado. No se realizó ningún cobro. Te llevamos a tus cursos...";

        setTimeout(function () {
            window.location.href = "user.html";
        }, 1800);

        return true;
    }

    // ---------- Eventos de pago ----------
    document.getElementById("payment-form").addEventListener("submit", async function (event) {
        event.preventDefault();
        const form = event.target;
        const ok = await completePayment("tarjeta");
        if (ok) form.reset();
    });

    walletButton.addEventListener("click", function () {
        completePayment(selectedMethod === "yape" ? "Yape" : "Plin");
    });

    paypalButton.addEventListener("click", function () {
        completePayment("PayPal");
    });

    // ---------- Inicio ----------
    updateButtons();

    // Mantiene los botones al día si cambia el precio mostrado
    new MutationObserver(updateButtons).observe(
        document.getElementById("summary-price"),
        { childList: true, characterData: true, subtree: true }
    );

    await loadCourse();
});