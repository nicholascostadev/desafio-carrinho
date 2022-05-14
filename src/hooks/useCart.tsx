import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	// Set localStorage value again every time "cart" value changes
	// and it does on all functions below
	const prevCartRef = useRef<Product[]>();

	useEffect(() => {
		prevCartRef.current = cart;
	});

	const cartPreviousValue = prevCartRef.current ?? cart;

	useEffect(() => {
		if (cartPreviousValue !== cart) {
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
		}
	}, [cart, cartPreviousValue]);
	// localStorage update end

	const addProduct = async (productId: number) => {
		try {
			const updatedCart = [...cart];
			const productExists = updatedCart.find(
				product => product.id === productId
			);

			const inStock = await api
				.get(`stock/${productId}`)
				.then(response => response.data.amount);

			const currentAmount = productExists ? productExists.amount : 0;
			const newAmount = currentAmount + 1;

			if (newAmount > inStock) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			if (productExists) {
				productExists.amount = newAmount;
			} else {
				// if it doesn't have this product yet
				const product = await api.get(`products/${productId}`);
				const newProduct = {
					...product.data,
					amount: 1,
				};
				// save data
				updatedCart.push(newProduct);
			}
			setCart(updatedCart);
		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const updatedCart = [...cart];
			const productIndex = updatedCart.findIndex(
				product => product.id === productId
			);

			if (productIndex >= 0) {
				updatedCart.splice(productIndex, 1);
				setCart(updatedCart);
			} else {
				throw Error(); // goes directly to "catch"
			}
		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({
		productId,
		amount: desiredAmount,
	}: UpdateProductAmount) => {
		try {
			// TODO
			if (desiredAmount <= 0) {
				return;
			}

			const inStock = await api
				.get(`stock/${productId}`)
				.then(response => response.data.amount);

			if (desiredAmount > inStock) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			const updatedCart = [...cart];
			const productExists = updatedCart.find(
				product => product.id === productId
			);

			if (productExists) {
				productExists.amount = desiredAmount;
				setCart(updatedCart);
			} else {
				throw Error(); // goes to "catch"
			}
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
