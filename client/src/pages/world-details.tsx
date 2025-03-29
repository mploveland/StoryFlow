import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Define the WorldDetails interface
interface WorldDetails {
  id: number;
  foundationId: number;
  world_name: string;
  narrative_context: string | null;
  global_geography_topography: string | null;
  regions_territories: string | null;
  boundaries_borders: string | null;
  climate_environmental_zones: string | null;
  environment_placements_distances: string | null;
  resources_economic_geography: string | null;
  historical_cultural_geography: string | null;
  speculative_supernatural_geography: string | null;
  map_generation_details: string | null;
  inspirations_references: string | null;
};

// Form schema for world details
const worldDetailsSchema = z.object({
  world_name: z.string().min(1, "World name is required"),
  narrative_context: z.string().optional(),
  global_geography_topography: z.string().optional(),
  regions_territories: z.string().optional(),
  boundaries_borders: z.string().optional(),
  climate_environmental_zones: z.string().optional(),
  environment_placements_distances: z.string().optional(),
  resources_economic_geography: z.string().optional(),
  historical_cultural_geography: z.string().optional(),
  speculative_supernatural_geography: z.string().optional(),
  map_generation_details: z.string().optional(),
  inspirations_references: z.string().optional(),
});

type WorldDetailsFormValues = z.infer<typeof worldDetailsSchema>;

export default function WorldDetailsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get foundationId from URL query params
  const queryString = location.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  const foundationIdParam = params.get('foundationId');
  console.log('World details - location:', location);
  console.log('World details - query string:', queryString);
  console.log('World details - foundationId param:', foundationIdParam);
  
  const foundationId = foundationIdParam ? parseInt(foundationIdParam) : 0;
  
  // Redirect to dashboard if foundationId is invalid
  useEffect(() => {
    if (!foundationId || foundationId <= 0) {
      console.log('Invalid foundation ID, redirecting to dashboard');
      toast({
        title: 'Invalid parameters',
        description: 'The foundation ID is invalid. Redirecting to dashboard.',
      });
      setLocation('/dashboard');
    }
  }, [foundationId, setLocation, toast]);

  // Query to fetch world details
  const { data: worldDetails, isLoading } = useQuery<WorldDetails>({
    queryKey: [`/api/foundations/${foundationId}/world-details`],
    enabled: !!foundationId,
  });

  const form = useForm<WorldDetailsFormValues>({
    resolver: zodResolver(worldDetailsSchema),
    defaultValues: {
      world_name: "",
      narrative_context: "",
      global_geography_topography: "",
      regions_territories: "",
      boundaries_borders: "",
      climate_environmental_zones: "",
      environment_placements_distances: "",
      resources_economic_geography: "",
      historical_cultural_geography: "",
      speculative_supernatural_geography: "",
      map_generation_details: "",
      inspirations_references: "",
    },
  });

  // Update form with world data when available
  useEffect(() => {
    if (worldDetails) {
      form.reset({
        world_name: worldDetails.world_name || "",
        narrative_context: worldDetails.narrative_context || "",
        global_geography_topography: worldDetails.global_geography_topography || "",
        regions_territories: worldDetails.regions_territories || "",
        boundaries_borders: worldDetails.boundaries_borders || "",
        climate_environmental_zones: worldDetails.climate_environmental_zones || "",
        environment_placements_distances: worldDetails.environment_placements_distances || "",
        resources_economic_geography: worldDetails.resources_economic_geography || "",
        historical_cultural_geography: worldDetails.historical_cultural_geography || "",
        speculative_supernatural_geography: worldDetails.speculative_supernatural_geography || "",
        map_generation_details: worldDetails.map_generation_details || "",
        inspirations_references: worldDetails.inspirations_references || "",
      });
    }
  }, [worldDetails, form]);

  // Save world details
  const onSubmit = async (data: WorldDetailsFormValues) => {
    if (!foundationId) return;
    
    setIsSubmitting(true);
    try {
      const endpoint = worldDetails && worldDetails.id
        ? `/api/world-details/${worldDetails.id}`
        : `/api/foundations/${foundationId}/world-details`;
      
      await apiRequest(
        worldDetails && worldDetails.id ? "PATCH" : "POST", 
        endpoint, 
        data
      );
      
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/foundations/${foundationId}/world-details`] });
      
      toast({
        title: "World details saved",
        description: "Your world details have been successfully updated.",
      });
    } catch (error) {
      console.error("Error saving world details:", error);
      toast({
        title: "Error saving world details",
        description: "There was a problem saving your world details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate back to the foundation or dashboard
  const handleBack = () => {
    if (foundationId) {
      setLocation(`/foundation-details?foundationId=${foundationId}`);
    } else {
      setLocation("/dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">World Details</h1>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Core World Information</CardTitle>
              <CardDescription>
                Define the basic details of your story world
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="world_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>World Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter world name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="narrative_context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Narrative Context</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe how this world relates to your story's narrative" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="geography">
            <TabsList className="grid grid-cols-3 md:grid-cols-4">
              <TabsTrigger value="geography">Geography</TabsTrigger>
              <TabsTrigger value="regions">Regions & Climate</TabsTrigger>
              <TabsTrigger value="resources">Resources & History</TabsTrigger>
              <TabsTrigger value="speculative">Speculative Elements</TabsTrigger>
            </TabsList>

            <TabsContent value="geography" className="pt-4 space-y-4">
              <FormField
                control={form.control}
                name="global_geography_topography"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Global Geography & Topography</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the overall geography and topography of your world" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="regions" className="pt-4 space-y-4">
              <FormField
                control={form.control}
                name="regions_territories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regions & Territories</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the major regions and territories in your world" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="boundaries_borders"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Boundaries & Borders</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the boundaries and borders between regions" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="climate_environmental_zones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Climate & Environmental Zones</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the different climate and environmental zones" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="environment_placements_distances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Placements & Distances</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe how environments are placed and the distances between key locations" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="resources" className="pt-4 space-y-4">
              <FormField
                control={form.control}
                name="resources_economic_geography"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resources & Economic Geography</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the natural resources and economic aspects of your world's geography" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="historical_cultural_geography"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical & Cultural Geography</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe how geography has influenced history and culture in your world" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="speculative" className="pt-4 space-y-4">
              <FormField
                control={form.control}
                name="speculative_supernatural_geography"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speculative & Supernatural Geography</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any magical, supernatural, or speculative elements of your world's geography" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="map_generation_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Map Generation Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide details for generating a map of your world" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="inspirations_references"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspirations & References</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List any inspirations or references for your world's geography" 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save World Details"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}