import { Accordion, AccordionDetails, AccordionSummary, Checkbox, FormControlLabel, FormGroup, styled, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSourceOrgs as setSelectedSourceOrgs,
  updateSourceOrgs as updateSelectedSourceOrgs
} from "store/selectedFiltersSlice";
import { RootState } from "store/store";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';


const Filters = ({ className }: { className: string }) => {
  const dispatch = useDispatch();
  const { sourceOrgs: selectedSourceOrgs } = useSelector((state: RootState) => state.selectedFilters);
  const [sourceOrgs, setSourceOrgs] = useState([]);
  useEffect(() => {
    const fetchSourceOrgs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/filters/source_org`);
        const data = await response.json();

        setSourceOrgs(data);

        // Initialize selection state
        const initialSourceOrgsState = data.reduce((acc: any, d: string) => {
          acc[d] = false;
          return acc;
        }, {});

        dispatch(setSelectedSourceOrgs(initialSourceOrgsState));
      } catch (error) {
        console.error('Failed to fetch source orgs:', error);
      }
    };
    fetchSourceOrgs();
  }, []);

  const handleChange = (event: any) => {
    const { name, checked } = event.target;
    // @ts-ignore
    console.log('updating selected orgs', name, checked);
    dispatch(updateSelectedSourceOrgs({ [name]: checked }));
  };

  if (Array.isArray(sourceOrgs) && sourceOrgs.length > 0) {
    return (
      <div className={className}>
        <Typography variant="h3" className="text-sm mb-2">Search Filters</Typography>
        <div>
          <Accordion
            className="
              !relative
              !w-full
              border
              border-gray-200"
          >
            <AccordionSummary
              className="bg-gray-100"
              expandIcon={<ExpandMoreIcon />}
            >
              <Typography className="uppercase text-sm font-bold">Source Organization</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {
                  sourceOrgs.map((sourceOrg: string) =>
                    <FormControlLabel
                      key={sourceOrg}
                      control={
                        <Checkbox
                          // @ts-ignore
                          checked={selectedSourceOrgs[sourceOrg] ?? false}
                          onChange={handleChange}
                          name={sourceOrg}
                        />}
                      label={sourceOrg} />
                  )
                }
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        </div>
      </div>
    );
  }
}

export default Filters;