import {SectionCards} from "@/components/section-cards.tsx";
import {ChartAreaInteractive} from "@/components/chart-area-interactive.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Activity, DollarSign, Package, ShoppingCart, TrendingUp, Users} from "lucide-react";

const DashBoardPage = () => {
    return (
        <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <SectionCards/>
                    <div className="px-4 lg:px-6">
                        <Tabs defaultValue="revenue" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-2 lg:w-100">
                                <TabsTrigger value="revenue" className="gap-2 cursor-pointer">
                                    <TrendingUp className="h-4 w-4"/>
                                    Revenue Trends
                                </TabsTrigger>
                                <TabsTrigger value="activity" className="gap-2 cursor-pointer">
                                    <Activity className="h-4 w-4"/>
                                    Activity
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="revenue" className="space-y-4">
                                <ChartAreaInteractive/>
                            </TabsContent>
                            <TabsContent value="activity" className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <Card>
                                        <CardHeader
                                            className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                Total Orders
                                            </CardTitle>
                                            <ShoppingCart className="h-4 w-4 text-muted-foreground"/>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">Loading...</div>
                                            <p className="text-xs text-muted-foreground">
                                                Orders processed today
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader
                                            className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                Total Products
                                            </CardTitle>
                                            <Package className="h-4 w-4 text-muted-foreground"/>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">Loading...</div>
                                            <p className="text-xs text-muted-foreground">
                                                In stock items
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader
                                            className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                Active Users
                                            </CardTitle>
                                            <Users className="h-4 w-4 text-muted-foreground"/>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">Loading...</div>
                                            <p className="text-xs text-muted-foreground">
                                                Last 7 days
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="px-4 lg:px-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>
                                    Frequently used operations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <button
                                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all">
                                        <ShoppingCart className="h-6 w-6 text-primary"/>
                                        <span className="text-sm font-medium">New Order</span>
                                    </button>
                                    <button
                                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all">
                                        <Package className="h-6 w-6 text-primary"/>
                                        <span className="text-sm font-medium">Add Product</span>
                                    </button>
                                    <button
                                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all">
                                        <Users className="h-6 w-6 text-primary"/>
                                        <span className="text-sm font-medium">New Customer</span>
                                    </button>
                                    <button
                                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all">
                                        <DollarSign className="h-6 w-6 text-primary"/>
                                        <span className="text-sm font-medium">View Reports</span>
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashBoardPage;