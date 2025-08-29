import { Product } from "../models/product.model.js";
import { Rating } from "../models/rating.model.js";
import { Settings } from "../models/settings.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Controller: getProducts
export const getProducts = async (req, res) => {
  try {
    // --- parse + sanitize params ---
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 25;
    const { search = "", filters = "", sort = "" } = req.query;

    page = Math.max(page, 1);
    limit = Math.min(Math.max(limit, 1), 50);
    const skip = (page - 1) * limit;

    // --- helper: parse filters string like "company:Acme,Globex;price:0-100;stock:0-50" ---
    const parseFilters = (filtersString) => {
      const out = {};
      if (!filtersString) return out;

      filtersString.split(";").forEach((f) => {
        const [key, value] = f.split(":");
        if (!key || value === undefined) return;

        if ((key === "price" || key === "stock") && value.includes("-")) {
          const [minRaw, maxRaw] = value.split("-");
          const min = Number(minRaw) || 0;
          const max = Number(maxRaw) || 0;
          out[key] = { min, max };
        } else if (value.includes(",")) {
          out[key] = value.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          out[key] = value === "true" ? true : value === "false" ? false : value;
        }
      });

      return out;
    };

    const parsedFilters = parseFilters(filters);
    // normalize company filter into array of strings
    const companyFilters = Array.isArray(parsedFilters.company)
      ? parsedFilters.company.map((c) => String(c).trim()).filter(Boolean)
      : parsedFilters.company
      ? [String(parsedFilters.company).trim()]
      : [];

    // --- STEP 1: SEARCH (DB call) ---
    // Only use search for DB query. Do NOT apply filters/sorting here.
    const baseQuery = {
      isVisible: true,
      status: "active",
      isVerified: true,
    };

    if (search && String(search).trim()) {
      const s = String(search).trim();
      const or = [
        { name: { $regex: s, $options: "i" } },
        { ci: { $regex: s, $options: "i" } },
        { tone: { $regex: s, $options: "i" } },
      ];
      // include id match if it looks like an ObjectId
      if (mongoose && mongoose.Types && mongoose.Types.ObjectId.isValid(s)) {
        or.push({ _id: new mongoose.Types.ObjectId(s) });
      }
      baseQuery.$or = or;
    }

    // projection - keep it minimal
    const projection = {
      name: 1,
      price: 1,
      currency: 1,
      ci: 1,
      tone: 1,
      stock: 1,
      stockUnit: 1,
      image: 1,
      seller: 1,
      isFeatured: 1,
      description: 1,
    };

    // fetch search candidates (no filters)
    const searchCandidates = await Product.find(baseQuery, projection).lean();

    // if no results, respond quickly with empty meta
    if (!searchCandidates || searchCandidates.length === 0) {
      const settings = await Settings.findOne({}, { usdToInrRate: 1 }).lean();
      return res.status(200).json({
        message: "Products fetched successfully",
        total: 0,
        count: 0,
        page,
        limit,
        totalPages: 0,
        products: [],
        usdToInrRate: settings?.usdToInrRate ?? null,
        companies: [],
        maxPrice: 0,
        maxStock: 0,
      });
    }

    // --- Resolve sellers for the searchCandidates so we can compute companies for filters ---
    const sellerIds = [...new Set(searchCandidates.map((p) => String(p.seller)))].filter(Boolean);
    const users = await User.find(
      { _id: { $in: sellerIds }, isActive: true },
      { company: 1, username: 1 }
    ).lean();
    const sellersMap = new Map(users.map((u) => [String(u._id), { company: u.company, username: u.username }]));

    // enrich searchCandidates with seller info; drop products without active seller info
    const searchProductsWithSeller = searchCandidates
      .map((p) => {
        const sellerInfo = sellersMap.get(String(p.seller));
        if (!sellerInfo) return null;
        return {
          ...p,
          seller: {
            id: p.seller,
            company: sellerInfo.company,
            username: sellerInfo.username,
          },
        };
      })
      .filter(Boolean);

    // --- STEP 2 (important): Compute search-level metadata (based on SEARCH results only) ---
    // These are what frontend should use to build filter UI (buckets etc.)
    const uniqueCompanies = [
      ...new Set(searchProductsWithSeller.map((p) => String(p.seller.company || "")).filter(Boolean)),
    ];
    const maxPriceFromSearch = searchProductsWithSeller.length
      ? Math.max(...searchProductsWithSeller.map((p) => Number(p.price) || 0))
      : 0;
    const maxStockFromSearch = searchProductsWithSeller.length
      ? Math.max(...searchProductsWithSeller.map((p) => Number(p.stock) || 0))
      : 0;

    // --- STEP 3: APPLY FILTERS (in-memory, using parsedFilters) ---
    // We filter the searchProductsWithSeller (search results) using company/price/stock filters
    let filtered = [...searchProductsWithSeller];

    if (companyFilters.length > 0) {
      const lowerCompanies = companyFilters.map((c) => c.toLowerCase());
      filtered = filtered.filter((p) => {
        const sellerCompany = String(p.seller?.company || "").toLowerCase();
        return lowerCompanies.includes(sellerCompany);
      });
    }

    if (parsedFilters.price && typeof parsedFilters.price.min === "number" && typeof parsedFilters.price.max === "number") {
      filtered = filtered.filter((p) => {
        const pr = Number(p.price) || 0;
        return pr >= parsedFilters.price.min && pr <= parsedFilters.price.max;
      });
    }

    if (parsedFilters.stock && typeof parsedFilters.stock.min === "number" && typeof parsedFilters.stock.max === "number") {
      filtered = filtered.filter((p) => {
        const st = Number(p.stock) || 0;
        return st >= parsedFilters.stock.min && st <= parsedFilters.stock.max;
      });
    }

    // --- STEP 4: SORT (in-memory, after filtering) ---
    // Keep original DB order when sort === 'relevant'
    let sorted = filtered;
    if (sort && sort !== "relevant") {
      const [sortBy = "name", sortDir = "asc"] = sort.split("-");
      const dir = sortDir === "asc" ? 1 : -1;

      sorted = filtered.slice().sort((a, b) => {
        if (sortBy === "price") return dir * ((Number(a.price) || 0) - (Number(b.price) || 0));
        if (sortBy === "stock") return dir * ((Number(a.stock) || 0) - (Number(b.stock) || 0));
        if (sortBy === "isFeatured") return dir * ((a.isFeatured ? 1 : 0) - (b.isFeatured ? 1 : 0));
        // default: name
        const an = String(a.name || "").toLowerCase();
        const bn = String(b.name || "").toLowerCase();
        if (an < bn) return -1 * dir;
        if (an > bn) return 1 * dir;
        return 0;
      });
    }

    // --- STEP 5: PAGINATE (in-memory) ---
    const totalAfterFilter = sorted.length;
    const totalPages = Math.ceil(totalAfterFilter / limit) || 0;
    const paginated = sorted.slice(skip, skip + limit);

    const settings = await Settings.findOne({}, { usdToInrRate: 1 }).lean();

    // --- RESPONSE ---
    return res.status(200).json({
      message: "Products fetched successfully",
      // total should reflect number after filtering (useful for pagination UI)
      total: totalAfterFilter,
      count: paginated.length,
      page,
      limit,
      totalPages,
      products: paginated,
      usdToInrRate: settings?.usdToInrRate ?? null,
      // IMPORTANT: companies/max values come from SEARCH results (not filtered/paginated)
      companies: uniqueCompanies,
      maxPrice: maxPriceFromSearch,
      maxStock: maxStockFromSearch,
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    return res.status(500).json({ message: "Something went wrong while fetching products" });
  }
};



export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne(
      {
        $and: [
          { _id: req.params.id },
          { isVisible: true },
          { status: "active" },
          { isVerified: true },
        ],
      },
      {
        name: true,
        price: true,
        currency: true,
        description: true,
        stock: true,
        ci: true,
        isFeatured: true,
        tone: true,
        stockUnit: true,
        image: true,
        seller: true,
      }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const seller = await User.findOne(
      { _id: product.seller },
      { id: true, username: true, company: true }
    );

    const ratings = await Rating.find(
      { product: product._id },
      {
        name: true,
        email: true,
        rating: true,
        comment: true,
        createdAt: true,
      }
    );

    const ratingCount = ratings.length;
    const ratingSum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const ratingAverage =
      ratingCount === 0 ? 0 : (ratingSum / (ratingCount * 5)) * 5;

    const settings = await Settings.findOne(
      {},
      {
        usdToInrRate: true,
      }
    );

    res.status(200).json({
      message: "Product found",
      product,
      ratingCount,
      ratingSum,
      ratingAverage,
      ratings,
      usdToInrRate: settings?.usdToInrRate || null,
      sellerName: seller?.username || null,
      sellerCompany: seller?.company || null,
      sellerId: seller?._id || null,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong while fetching product" });
  }
};

export const getFeaturedProducts = async (req, res) => {
  let { page = 1, limit = 25 } = req.query;

  page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 50);

  const skip = (page - 1) * limit;

  const featuredProducts = await Product.find(
    {
      isFeatured: true,
      isVisible: true,
      status: "active",
      isVerified: true,
    },
    {
      id: true,
      name: true,
      price: true,
      description: true,
      currency: true,
      ci: true,
      isFeatured: true,
      tone: true,
      stock: true,
      stockUnit: true,
      image: true,
      seller: true,
    }
  )
    .skip(skip)
    .limit(limit)
    .lean();

  const sellerIds = [
    ...new Set(featuredProducts.map((p) => p.seller.toString())),
  ];

  const settings = await Settings.findOne({}, { usdToInrRate: true }).lean();

  const users = await User.find(
    {
      _id: { $in: sellerIds },
      isActive: true,
    },
    { id: true, username: true, company: true }
  ).lean();

  const sellersMap = new Map(
    users.map((u) => [
      u._id.toString(),
      { username: u.username, company: u.company },
    ])
  );

  const featuredProductsData = featuredProducts
    .map((p) => {
      const company = sellersMap.get(p.seller.toString());
      if (!company) return null;
      return {
        ...p,
        seller: {
          username: company.username,
          company: company.company,
          id: p.seller,
        },
      };
    })
    .filter(Boolean);

  const totalProducts = await Product.countDocuments();

  res.status(200).json({
    message: "Featured products found",
    products: featuredProductsData,
    totalProducts,
    count: featuredProductsData.length,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalProducts / limit),
    usdToInrRate: settings?.usdToInrRate ?? null,
  });
};

export const getSellerProducts = async (req, res) => {
  const { id, product } = req.params;
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 25;

  if (!id) {
    return res.status(400).json({ message: "Seller not found" });
  }

  page = Math.max(page, 1);
  limit = Math.min(Math.max(limit, 1), 50);

  const skip = (page - 1) * limit;
  try {
    const seller = await User.findOne(
      { _id: id, isActive: true },
      { role: true, isActive: true, username: true }
    );

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    if (seller.role !== "seller" || !seller.isActive) {
      return res.status(403).json({ message: "Seller not authorized" });
    }

    let products = await Product.find(
      {
        _id: { $ne: product },
        seller: id,
        isVisible: true,
        status: "active",
        isVerified: true,
      },
      {
        id: true,
        name: true,
        price: true,
        ci: true,
        tone: true,
        isFeatured: true,
        currency: true,
        stock: true,
        stockUnit: true,
        sales: true,
        isVisible: true,
        image: true,
        seller: true,
        status: true,
      }
    )
      .skip(skip)
      .limit(limit)
      .lean();

    const settings = await Settings.findOne({}, { usdToInrRate: true }).lean();

    const users = await User.find(
      {
        _id: { $in: products.map((p) => p.seller) },
        isActive: true,
      },
      { id: true, company: true, username: true }
    ).lean();

    const sellersMap = new Map(
      users.map((u) => [
        u._id.toString(),
        { company: u.company, username: u.username },
      ])
    );

    const productsData = products
      .map((p) => {
        const seller = sellersMap.get(p.seller.toString());
        if (!seller) return null;
        return {
          ...p,
          seller: {
            username: seller.username,
            company: seller.company,
            id: p.seller,
          },
        };
      })
      .filter(Boolean);

    res.status(200).json({
      message: "Products fetched successfully",
      products: productsData,
      totalProducts: await Product.countDocuments({
        seller: id,
        isVisible: true,
        status: "active",
        isVerified: true,
      }),
      seller: seller.username,
      count: products.length,
      usdToInrRate: settings?.usdToInrRate ?? null,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(
        (await Product.countDocuments({
          seller: id,
          isVisible: true,
          status: "active",
          isVerified: true,
        })) / limit
      ),
    });
  } catch (error) {
    console.error("Error in getSellerProducts:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching seller products" });
  }
};

export const getMoreProducts = async (req, res) => {
  const { id } = req.params;
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 25;

  if (!id) {
    return res.status(400).json({ message: "Seller not found" });
  }

  page = Math.max(page, 1);
  limit = Math.min(Math.max(limit, 1), 50);

  const skip = (page - 1) * limit;
  try {
    let products = await Product.find(
      {
        seller: { $ne: id },
        isVisible: true,
        status: "active",
        isVerified: true,
      },
      {
        id: true,
        name: true,
        price: true,
        ci: true,
        tone: true,
        currency: true,
        stock: true,
        stockUnit: true,
        isFeatured: true,
        seller: true,
        sales: true,
        isVisible: true,
        image: true,
        status: true,
      }
    )
      .skip(skip)
      .limit(limit)
      .lean();

    const settings = await Settings.findOne({}, { usdToInrRate: true }).lean();

    const sellerIds = products.map((p) => p.seller.toString());
    const users = await User.find(
      { _id: { $in: sellerIds } },
      { id: true, company: 1 }
    ).lean();
    const sellersMap = new Map(
      users.map((u) => [
        u._id.toString(),
        { company: u.company, username: u.username },
      ])
    );
    let productsData = products.map((p) => ({
      ...p,
      seller:
        {
          username: sellersMap.get(p.seller.toString())?.username,
          company: sellersMap.get(p.seller.toString())?.company,
          id: p.seller,
        } || null,
    }));

    res.status(200).json({
      message: "Products fetched successfully",
      products: productsData,
      totalProducts: await Product.countDocuments({
        isVisible: true,
        status: "active",
        isVerified: true,
      }),
      count: products.length,
      usdToInrRate: settings?.usdToInrRate ?? null,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(
        (await Product.countDocuments({
          isVisible: true,
          status: "active",
          isVerified: true,
        })) / limit
      ),
    });
  } catch (error) {
    console.error("Error in getSellerProducts:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching seller products" });
  }
};
