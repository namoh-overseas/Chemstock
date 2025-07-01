import { Product } from "../models/product.model.js";
import { Rating } from "../models/rating.model.js";
import { Settings } from "../models/settings.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

export const getProducts = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 25;
    const { search = "", filters = "", sort = "" } = req.query;

    // Ensure pagination boundaries
    page = Math.max(page, 1);
    limit = Math.min(Math.max(limit, 1), 50);
    const skip = (page - 1) * limit;

    // Parse filters
    const parseFilters = (filtersString) => {
      const filters = {};
      if (!filtersString) return filters;

      filtersString.split(";").forEach((filter) => {
        const [key, value] = filter.split(":");
        if (!key || !value) return;

        if (value.includes("-") && (key === "price" || key === "stock")) {
          const [min, max] = value.split("-").map(Number);
          filters[key] = { min, max };
        } else if (value.includes(",")) {
          filters[key] = value.split(",");
        } else {
          filters[key] =
            value === "true" ? true : value === "false" ? false : value;
        }
      });

      return filters;
    };

    const { company, price, stock } = parseFilters(filters);

    const filterQuery = {
      isVisible: true,
      status: "active",
      isVerified: true,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { ci: { $regex: search, $options: "i" } },
          { tone: { $regex: search, $options: "i" } },
          ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: new mongoose.Types.ObjectId(search) }] : [])
        ],
      }),
      ...(company &&
        Array.isArray(company) &&
        company.length && {
          company: { $in: company.map((c) => new RegExp(c, "i")) },
        }),
      ...(price && {
        price: {
          $gte: isNaN(price.min) ? 0 : Number(price.min),
          $lte: isNaN(price.max) ? 999999 : Number(price.max),
        },
      }),
      ...(stock && {
        stock: {
          $gte: isNaN(stock.min) ? 0 : Number(stock.min),
          $lte: isNaN(stock.max) ? 999999 : Number(stock.max),
        },
      }),
    };

    // Sorting
    let sortQuery = {};
    if (sort && sort !== "relevant") {
      const [sortBy = "name", sortDir = "asc"] = sort.split("-");
      sortQuery[sortBy === "isFeatured" ? "isFeatured" : sortBy] =
        sortDir === "asc" ? 1 : -1;
    }

    const products = await Product.find(filterQuery, {
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
    })
      .skip(skip)
      .limit(limit)
      .sort(sortQuery)
      .lean();

    // Seller Mapping
    const sellerIds = [...new Set(products.map((p) => p.seller.toString()))];
    const users = await User.find(
      { _id: { $in: sellerIds }, isActive: true },
      { company: 1, username: 1 }
    ).lean();
    const sellersMap = new Map(
      users.map((u) => [
        u._id.toString(),
        { company: u.company, username: u.username },
      ])
    );

    const productsWithSeller = products
      .map((p) => {
        const sellerData = sellersMap.get(p.seller.toString());
        if (!sellerData) return null;
        return {
          ...p,
          seller: {
            username: sellerData.username,
            company: sellerData.company,
            id: p.seller,
          },
        };
      })
      .filter(Boolean);

    const uniqueCompanies = [
      ...new Set(productsWithSeller.map((p) => p.seller.company)),
    ];
    const maxPrice = productsWithSeller.length
      ? Math.max(...productsWithSeller.map((p) => p.price))
      : 0;
    const maxStock = productsWithSeller.length
      ? Math.max(...productsWithSeller.map((p) => p.stock))
      : 0;

    const settings = await Settings.findOne({}, { usdToInrRate: 1 }).lean();

    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      message: "Products fetched successfully",
      total: totalProducts,
      count: productsWithSeller.length,
      page,
      limit,
      totalPages,
      products: productsWithSeller,
      usdToInrRate: settings?.usdToInrRate ?? null,
      companies: uniqueCompanies,
      maxPrice,
      maxStock,
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    res.status(500).json({
      message: "Something went wrong while fetching products",
    });
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
