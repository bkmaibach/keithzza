let menu = {}

menu.items = [
        {
            'sku' : '100000',
            'name' : 'Pepperoni Pizza',
            'description' : 'A classic freshly baked 12" pizza with genuine Italian pepperoni',
            'price' : 11.99,
        },
        {
            'sku' : '100001',
            'name' : 'Pound of Wings',
            'description' : 'Nuff said',
            'price' : 12.99,
        },
        {
            'sku' : '100002',
            'name' : 'Pasta',
            'description' : 'Served el dente with marinara sauce',
            'price' : 13.99,
        },
        {
            'sku' : '100003',
            'name' : 'Lasagna',
            'description' : 'Just like your mama used to make, served with garlic bread',
            'price' : 11.99,
        }
]

menu.getItemPrice = (sku) => {
    let price = 0;
    menu.items.forEach((item) => {
        if(item.sku == sku){
            price = item.price;
        }
    });
    return price;
}



module.exports = menu;